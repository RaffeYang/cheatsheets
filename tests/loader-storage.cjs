const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const values = new Map();
let reads = 0, active = 0, maximum = 0;
const native = fs.promises;
const mockFs = { ...fs, promises: { ...native, readFile: async (...args) => {
  reads++; active++; maximum = Math.max(maximum, active);
  try { if (String(args[0]).endsWith('broken.md')) throw new Error('unreadable'); return await native.readFile(...args); } finally { active--; }
}, readdir: async (...args) => { if (String(args[0]).endsWith('blocked')) throw new Error('blocked directory'); return native.readdir(...args); } } };
const storage = { getItem: async key => values.get(key), setItem: async (key, value) => { await new Promise(resolve => setTimeout(resolve, 1)); values.set(key, value); } };
function makeLoader() {
  const modules = new Map();
  function load(filename) {
    filename = path.resolve(filename);
    if (modules.has(filename)) return modules.get(filename).exports;
    const mod = { exports: {} }; modules.set(filename, mod);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, esModuleInterop: true } }).outputText;
    vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename })(name => {
      if (name === '@raycast/api') return { LocalStorage: storage };
      if (name === 'fs') return mockFs;
      if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), name + '.tsx'));
      return require(name);
    }, mod, mod.exports);
    return mod.exports;
  }
  return load;
}
(async () => {
  const root = await native.mkdtemp(path.join(os.tmpdir(), 'cheatsheets-loader-'));
  try {
    await native.mkdir(path.join(root, 'blocked'));
    await Promise.all(Array.from({ length: 20 }, (_, i) => native.writeFile(path.join(root, `${i}.md`), i === 0 ? '---\ntitle: Custom title\n---\nHello' : `# Doc ${i}`)));
    await native.writeFile(path.join(root, 'broken.md'), 'unreadable');
    const load = makeLoader(); const loader = load('src/utils/SnippetsLoader.tsx');
    const first = await loader.loadAllSnippets(root);
    assert.equal(first.snippets.length, 20); assert.equal(first.errors.length, 2);
    assert.equal(first.snippets.find(x => x.fullPath.endsWith('/0.md')).name, 'Custom title');
    assert.ok(first.snippets.every(x => path.isAbsolute(x.fullPath))); assert.ok(maximum <= 8);
    const cold = reads; const second = await loader.loadAllSnippets(root);
    assert.equal(reads - cold, 1); assert.equal(second.snippets[0], first.snippets[0]);
    const beforeRestart = reads; await makeLoader()('src/utils/SnippetsLoader.tsx').loadAllSnippets(root);
    assert.equal(reads - beforeRestart, 1);
    await native.writeFile(path.join(root, '0.md'), '# Changed content longer');
    await native.unlink(path.join(root, '1.md'));
    const beforeChange = reads; const third = await loader.loadAllSnippets(root);
    assert.equal(reads - beforeChange, 2); assert.equal(third.snippets.length, 19);
    assert.ok(!third.snippets.some(x => x.fullPath.endsWith('/1.md')));
    const helpers = load('src/utils/LocalStorageHelper.tsx');
    values.set('lastCopiedMap', '{corrupt');
    await Promise.all(first.snippets.map(x => helpers.storeLastCopied(x)));
    assert.equal(Object.keys(await helpers.getLastCopiedMap()).length, 20);
    const copy = [...first.snippets]; await helpers.orderSnippets(first.snippets); assert.deepEqual(first.snippets, copy);
    const state = { favorites: ['x'], bookmarks: { x: ['a'] }, reading: { x: { headingId: 'a', headingSearch: 'A' } } };
    await helpers.saveReaderState(state); assert.deepEqual(await helpers.loadReaderState(), state);
    values.set('readerState', '{corrupt'); assert.deepEqual(await helpers.loadReaderState(), { favorites: [], bookmarks: {}, reading: {} });
    console.log(`PASS: loader/storage; cold ${cold} reads, warm 1 failed read, fresh module 1 failed read, edit/delete 1 changed + 1 failed read; max concurrent reads ${maximum}`);
  } finally { await native.rm(root, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
