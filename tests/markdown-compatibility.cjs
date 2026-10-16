const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
const exportsObject = {};
const modulePath = 'src/utils/MarkdownCompatibility.ts';
assert.ok(fs.existsSync(modulePath), 'display Markdown adapter exists');
vm.runInNewContext(ts.transpile(fs.readFileSync(modulePath, 'utf8'), { module: ts.ModuleKind.CommonJS }), { exports: exportsObject });
const adapt = exportsObject.adaptMarkdownForDisplay;
const input = '### 动作\n<!--rehype:wrap-class=row-span-2-->\n\n快捷方式 | 说明\n:- | -\n方向键 | `h` \\| `j`\n<!--rehype:className=shortcuts-last-->\n\n- 普通列表\n1. 有序列表';
const output = adapt(input);
assert.match(output, /\| 快捷方式 \| 说明 \|\n\| :- \| - \|\n\| 方向键 \| `h` \\\| `j` \|/);
assert.ok(!output.includes('rehype'));
assert.ok(output.includes('- 普通列表\n1. 有序列表'));
assert.equal(adapt('before <!-- hidden\ncomment --> after'), 'before \n after');
assert.equal(adapt('`<!-- visible -->` and <!-- hidden -->text'), '`<!-- visible -->` and text');
for (const fence of ['```', '~~~~']) {
  const code = `${fence}md\n<!-- keep -->\nA | B\n- | -\nx | y\n${fence}`;
  assert.equal(adapt(code), code, 'fenced examples unchanged');
}
const indent = '    <!-- keep -->\n    A | B\n    - | -';
assert.equal(adapt(indent), indent, 'indented code unchanged');
assert.equal(adapt('ordinary a | b\nnext line'), 'ordinary a | b\nnext line');
assert.equal(adapt('| A | B |\n| --- | --- |\n| x | y |'), '| A | B |\n| --- | --- |\n| x | y |');
assert.equal(adapt('A | B\n--- | ---\nx | y\nparagraph'), '| A | B |\n| --- | --- |\n| x | y |\n\nparagraph');
assert.equal(adapt(output), output, 'adapter is idempotent');
for (const name of ['Vim', 'Redis']) {
  const original = fs.readFileSync(`tests/fixtures/${name.toLowerCase()}.md`, 'utf8');
  const adapted = adapt(original);
  assert.ok(!adapted.includes('<!--rehype:'), `${name} layout comments removed`);
  const beforeCode = original.match(/```[\s\S]*?```/g) ?? [];
  const afterCode = adapted.match(/```[\s\S]*?```/g) ?? [];
  assert.deepEqual(afterCode, beforeCode, `${name} code blocks preserved`);
  assert.ok(adapted.includes('| '), `${name} canonical tables produced`);
}
console.log('PASS: tables, escapes, comments, lists, fenced/indented code and real Vim/Redis docs');
