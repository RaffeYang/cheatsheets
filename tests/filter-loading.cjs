const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('src/cheatsheets.tsx', 'utf8');
const start = source.indexOf('  // Handle filter folder');
const end = source.indexOf('  // Extract headings', start);
const ts = require('typescript');
const effectCode = ts.transpile(source.slice(start, end), { target: ts.ScriptTarget.ES2023 });
const snippets = [
  { folder: 'languages', content: { tags: ['code'] } },
  { folder: 'tools', content: { tags: ['cli'] } },
];
for (const [filter, expected] of [['all', snippets], ['folder:languages', [snippets[0]]], ['tag:cli', [snippets[1]]]]) {
  let effect;
  let current = { snippets, filteredSnippets: snippets, selectedFilter: filter };
  vm.runInNewContext(effectCode, {
    state: { snippets: [], selectedFilter: filter },
    useEffect: (callback) => { effect = callback; },
    setState: (update) => { current = update(current); },
  });
  effect();
  assert.deepEqual(current.filteredSnippets, expected, `Delayed ${filter} effect must use loaded snippets`);
}
console.log('PASS: delayed All, folder, and tag filters preserve loaded data');
