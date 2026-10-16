const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
const exportsObject = {};
vm.runInNewContext(ts.transpile(fs.readFileSync('src/utils/SnippetSearch.ts', 'utf8'), { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 }), { exports: exportsObject });
const { searchSnippets } = exportsObject;
const snippets = [
  { name: 'Python', folder: 'languages', content: { content: 'Print Hello 世界', rawMetadata: 'Title: example', tags: ['code'], description: 'Reference' } },
  { name: 'Git', folder: 'tools', content: { content: 'git commit', rawMetadata: '', tags: ['cli'] } },
];
assert.equal(searchSnippets(snippets, ''), snippets);
for (const query of ['PYTHON', 'hello print', '世界', 'languages', 'example', 'code', 'Reference']) {
  assert.deepEqual(searchSnippets(snippets, query), [snippets[0]], query);
}
assert.deepEqual(searchSnippets(snippets, 'git cli'), [snippets[1]]);
assert.equal(searchSnippets(snippets, 'missing').length, 0);
const reversed = [...snippets].reverse();
assert.deepEqual(searchSnippets(reversed, 'i'), reversed, 'preserve recency order');
let reads = 0;
const content = { get content() { reads++; return 'cached body'; }, tags: [], rawMetadata: '' };
const cached = [{ name: 'Cache', folder: '.', content }];
searchSnippets(cached, 'body');
searchSnippets(cached, 'cached');
assert.equal(reads, 1, 'document body normalized only once');
console.log('PASS: full-text, metadata, Chinese, multi-term, ordering and cached indexing');
const fuzzyRows = [
  { name: 'Python', folder: 'languages', content: { content: 'dictionary comprehension', rawMetadata: '', tags: ['programming'] } },
  { name: 'GitHub CLI', folder: 'tools', content: { content: 'pull request', rawMetadata: '', tags: ['terminal'] } },
];
assert.deepEqual(searchSnippets(fuzzyRows, 'pythn'), [fuzzyRows[0]], 'missing middle letter');
assert.deepEqual(searchSnippets(fuzzyRows, 'ghcli'), [fuzzyRows[1]], 'abbreviated compound title');
assert.deepEqual(searchSnippets(fuzzyRows, 'pythn dict'), [fuzzyRows[0]], 'fuzzy title plus full-text term');
assert.deepEqual(searchSnippets(fuzzyRows, 'trmnl'), [fuzzyRows[1]], 'fuzzy tag');
assert.deepEqual(searchSnippets(fuzzyRows, 'dctnry'), [fuzzyRows[0]], 'fuzzy body word');
assert.equal(searchSnippets(fuzzyRows, 'pythn unknown').length, 0, 'all query terms must match');
const ranked = [
  { name: 'Notes', folder: 'tools', content: { content: 'Python example', rawMetadata: '', tags: [] } },
  fuzzyRows[0],
];
assert.equal(searchSnippets(ranked, 'python')[0], fuzzyRows[0], 'title match ranks before body match');
assert.equal(searchSnippets(fuzzyRows, '   '), fuzzyRows);
console.log('PASS: fuzzy names, abbreviations, tags, body terms and title ranking');
const punctuated = [
  { name: 'Notes', folder: 'tools', content: { content: 'Next.js tutorial', rawMetadata: '', tags: [] } },
  { name: 'Next.js', folder: 'frameworks', content: { content: 'Next.js framework', rawMetadata: '', tags: [] } },
];
assert.equal(searchSnippets(punctuated, 'next.js')[0], punctuated[1], 'punctuated exact title ranks first');
const aliasRows = [
  { name: 'UV', folder: 'tools', content: { content: '', rawMetadata: '', tags: [] } },
  { name: 'Rust', folder: 'languages', content: { content: '', rawMetadata: '', tags: [] } },
  { name: 'Private Tool', folder: 'tools', content: { content: '', rawMetadata: '', tags: [], aliases: ['私人助手'] } },
];
assert.equal(searchSnippets(aliasRows, '虚拟环境')[0], aliasRows[0]);
assert.equal(searchSnippets(aliasRows, '所有权')[0], aliasRows[1]);
assert.equal(searchSnippets(aliasRows, '私人助手')[0], aliasRows[2]);
console.log('PASS: Chinese document aliases and custom frontmatter aliases');
