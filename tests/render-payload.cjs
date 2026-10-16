(async () => {
const fs = require('node:fs');
let nativeClears = 0;
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
const code = ts.transpile(fs.readFileSync('src/cheatsheets.tsx', 'utf8'), { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, jsx: ts.JsxEmit.ReactJSX });
function component(name, children = {}) { return Object.assign(name === 'List' ? function List() {} : function Component() {}, { testName: name }, children); }
const detail = component('Detail', { Metadata: component('Metadata', { TagList: component('TagList', { Item: component('Tag') }) }) });
const List = component('List', { Item: component('Item', { Detail: detail }), Dropdown: component('Dropdown', { Item: component('Option'), Section: component('Options') }), EmptyView: component('Empty') });
const Action = component('Action', Object.fromEntries(['CopyToClipboard', 'Paste'].map(name => [name, component(name)])));
const jsx = (type, props) => ({ type: type.testName ?? type, props });
const snippets = Array.from({ length: 10 }, (_, n) => ({ id: String(n), name: `Document ${n}`, folder: 'tools', content: { content: '# One\nFirst\n## Two\nSecond\n', rawMetadata: '', tags: [] } }));
function render(values, updates = []) {
  let index = 0;
  const exports = {};
  vm.runInNewContext(code, { exports, console, setTimeout: () => {}, clearTimeout: () => {}, require: (id) => {
    if (id === 'react') return { useState: initial => { const slot = index++; return [slot < values.length ? values[slot] : initial, value => updates.push({ slot, value })]; }, useEffect: () => {}, useMemo: f => f(), useRef: initial => ({ current: initial }) };
    if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (id === '@raycast/api') return { clearSearchBar: async () => { nativeClears++; }, List, Action, ActionPanel: component('ActionPanel', { Section: component('Section') }), Icon: {}, Toast: { Style: {} } };
    if (id.endsWith('MarkdownCompatibility')) {
      const result = {};
      vm.runInNewContext(ts.transpile(fs.readFileSync('src/utils/MarkdownCompatibility.ts', 'utf8'), { module: ts.ModuleKind.CommonJS }), { exports: result });
      return result;
    }
    if (id.endsWith('CustomActionPanel')) return { default: component('CustomActionPanel'), SnippetContentActions: component('SnippetContentActions') };
    if (id.endsWith('LocalStorageHelper')) return { saveReaderState: async () => {}, storeLastCopied: async () => {}, orderSnippets: async items => items };
    if (id.endsWith('DocumentHeadings')) {
      const result = {};
      vm.runInNewContext(ts.transpile(fs.readFileSync('src/utils/DocumentHeadings.ts', 'utf8'), { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 }), { exports: result });
      return result;
    }
    if (id.endsWith('SnippetSearch')) {
      const result = {};
      vm.runInNewContext(ts.transpile(fs.readFileSync('src/utils/SnippetSearch.ts', 'utf8'), { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 }), { exports: result });
      return result;
    }
    return {};
  }});
  return exports.default();
}
function find(tree, name, result = []) {
  if (!tree || typeof tree !== 'object') return result;
  if (Array.isArray(tree)) { tree.forEach(child => find(child, name, result)); return result; }
  if (tree.type?.testName === name || tree.type === name) result.push(tree);
  if (tree.props) Object.values(tree.props).forEach(child => find(child, name, result));
  return result;
}
const state = { snippets, filteredSnippets: snippets, folders: ['tools'], paths: ['/docs'], isLoading: false };
const main = render([state, null, [], null, '', null]);
assert.equal(find(main, 'Item').length, 10);
assert.equal(find(main, 'CustomActionPanel').length, 1, 'only highlighted document carries full-text actions');
assert.equal(find(main, 'Item').reduce((n, row) => n + (row.props.keywords?.length ?? 0), 0), 0, 'no full-text native keyword payload');
assert.equal(main.props.filtering, false, 'local full-text search controls filtering');
const headings = [{ id: 'one', text: 'One', level: 1 }, { id: 'two', text: 'Two', level: 2 }];
snippets[0].content.content = '# One\nFirst\n<!--rehype:hide-->\nA | B\n- | -\nx | y\n\n## Two\nSecond\n';
const document = render([state, snippets[0], headings, headings[0], '', null]);
assert.equal(find(document, 'Item').length, 2);
assert.equal(find(document, 'Detail').length, 1, 'only highlighted heading carries markdown');
assert.equal(find(document, 'CopyToClipboard').length, 2, 'section and full-copy actions only on highlighted heading');
assert.match(find(document, 'Detail')[0].props.markdown, /First/);
assert.ok(!find(document, 'Detail')[0].props.markdown.includes('rehype'), 'display hides layout comments');
assert.ok(find(document, 'CopyToClipboard')[0].props.content.includes('<!--rehype:hide-->'), 'copy section retains raw Markdown');
assert.equal(find(document, 'CopyToClipboard')[1].props.content, snippets[0].content.content, 'copy full document is unchanged');
console.log('PASS: sparse document actions, local search and one selected markdown detail');

const updates = [];
const interactive = render([state, null, [], null, '', null], updates);
interactive.props.onSearchTextChange('Documnt 3');
assert.equal(updates[0].slot, 4);
assert.equal(updates[0].value, 'Documnt 3', 'typing immediately updates query state');
assert.equal(interactive.props.throttle, false);
const filtered = render([state, null, [], null, 'Documnt 3', null]);
assert.equal(find(filtered, 'Item').length, 1);
assert.equal(find(filtered, 'Item')[0].props.title, 'Document 3');
console.log('PASS: input callback immediately filters with fuzzy search');
// Opening a document must populate headings before the first detail-page render.
snippets[0].content.content = '# Manual\nIntro\n## Basics\n### Variables\nSmall example\n### Functions\nAnother example';
const openingUpdates = [];
const openingList = render([state, null, [], null, 'swi', null, ''], openingUpdates);
const unfilteredOpeningList = render([state, null, [], null, '', null, ''], openingUpdates);
await find(unfilteredOpeningList, 'Action').find(action => action.props.title === 'Open').props.onAction();
assert.equal(nativeClears, 1, 'Open explicitly clears native host search before navigation');
assert.ok(openingUpdates.find(update => update.slot === 2)?.value.length > 0, 'headings prepared in the open action');
const firstSection = openingUpdates.find(update => update.slot === 3)?.value;
assert.equal(firstSection?.text, 'Variables', 'initial detail is a small concrete section');
const pageValues = [state, null, [], null, 'swi', null, 'swi'];
for (const update of openingUpdates) pageValues[update.slot] = update.value;
const openedPage = render(pageValues);
assert.equal(openedPage.props.searchText, '', 'document search is cleared on the initial render');
assert.ok(find(openedPage, 'Item').length > 0, 'initial detail render already contains headings');
assert.equal(find(openedPage, 'Detail').length, 1);
console.log('PASS: atomic document opening with cleared search and a small initial section');
const largeBody = 'Heavy child content\n\n'.repeat(4000);
const parentSnippet = { ...snippets[0], content: { ...snippets[0].content, content: '# Rust\nShort introduction\n\n## Types\n' + largeBody } };
const parentHeadings = [{ id: 'rust', text: 'Rust', level: 1 }, { id: 'types', text: 'Types', level: 2 }];
const searchingParent = render([state, parentSnippet, parentHeadings, parentHeadings[0], '', null, 'ru']);
const preview = find(searchingParent, 'Detail')[0].props.markdown;
assert.ok(preview.length < 200, 'typing and selecting a parent heading must not render all children');
assert.ok(preview.includes('Short introduction'));
assert.ok(!preview.includes('Heavy child content'));
assert.ok(find(searchingParent, 'CopyToClipboard')[0].props.content.includes('Heavy child content'), 'copy section still includes child sections');
const childSnippet = { ...snippets[0], content: { ...snippets[0].content, content: '### Topic\nIntro\n#### Nested subtopic\nKeep this body\n### Next\nExclude this body' } };
const childHeadings = [{ id: 'topic', text: 'Topic', level: 3 }, { id: 'next', text: 'Next', level: 3 }];
const childPage = render([state, childSnippet, childHeadings, childHeadings[0], '', null, '']);
assert.ok(find(childPage, 'Detail')[0].props.markdown.includes('Keep this body'), 'H4 content remains visible under its H3');
assert.ok(!find(childPage, 'Detail')[0].props.markdown.includes('Exclude this body'));
console.log('PASS: bounded parent preview during heading search, complete copy and H4 content preserved');
const favoritesReader = { favorites: ['3'], bookmarks: {}, reading: {} };
const favoritesPage = render([{ ...state, selectedFilter: 'favorites' }, null, [], null, '', null, '', favoritesReader]);
assert.deepEqual(find(favoritesPage, 'Item').map(row => row.props.title), ['Document 3']);
const favoriteUpdates = [];
const favoritePage = render([state, null, [], null, '', null, '', favoritesReader], favoriteUpdates);
find(favoritePage, 'Action').find(action => action.props.title === 'Favorite Document').props.onAction();
assert.ok(favoriteUpdates.find(update => update.slot === 7).value.favorites.includes('0'));
const bookmarkUpdates = [];
const bookmarkPage = render([state, snippets[0], headings, headings[0], 'kept main query', '0', '', favoritesReader], bookmarkUpdates);
find(bookmarkPage, 'Action').find(action => action.props.title === 'Bookmark Section').props.onAction();
assert.ok(bookmarkUpdates.find(update => update.slot === 7).value.bookmarks['0'].includes('one'));
const reader = { favorites: [], bookmarks: { '0': ['two'] }, reading: { '0': { headingId: firstSection.id, headingSearch: 'swift' } } };
const restoreUpdates = [];
const restoreList = render([state, null, [], null, '', '0', '', reader], restoreUpdates);
await find(restoreList, 'Action').find(action => action.props.title === 'Open').props.onAction();
assert.equal(restoreUpdates.find(update => update.slot === 3).value.id, firstSection.id);
assert.equal(restoreUpdates.find(update => update.slot === 6).value, '', 'opening clears stale saved heading search');
assert.equal(restoreUpdates.find(update => update.slot === 7).value.reading['0'].headingSearch, '', 'stale saved query is cleared in storage');
assert.equal(restoreUpdates.find(update => update.slot === 4)?.value, '', 'Enter Open clears document search');
const jumpUpdates = [];
const jumpPage = render([state, snippets[0], headings, headings[0], 'main query', '0', 'query', reader], jumpUpdates);
find(jumpPage, 'Action').find(action => action.props.title === 'Two').props.onAction();
assert.equal(jumpUpdates.find(update => update.slot === 3).value.id, 'two');
assert.equal(jumpUpdates.find(update => update.slot === 6).value, '');
const backUpdates = [];
const backPage = render([state, snippets[0], headings, headings[0], 'main query', '0', '', reader], backUpdates);
find(backPage, 'Action').find(action => action.props.title === 'Back to Snippets').props.onAction();
assert.equal(backUpdates.find(update => update.slot === 1).value, null);
assert.ok(!backUpdates.some(update => [0,4,5].includes(update.slot)), 'Back retains filter and selected document');
assert.equal(backUpdates.find(update => update.slot === 6)?.value, '', 'Enter Back clears heading search');
assert.equal(backUpdates.find(update => update.slot === 7)?.value.reading['0'].headingSearch, '', 'cleared heading query is saved');
console.log('PASS: favorites, section bookmarks, bookmark jump, saved reading and Back state');

const copyUpdates = [];
const copyPage = render([state, null, [], null, 'Document', '0', '', favoritesReader], copyUpdates);
find(copyPage, 'CustomActionPanel')[0].props.handleAction(snippets[0]);
assert.equal(copyUpdates.find(update => update.slot === 4)?.value, '', 'copy/paste completion clears main query immediately');
const sectionCopyUpdates = [];
const sectionCopyPage = render([state, snippets[0], headings, headings[0], '', '0', 'One', favoritesReader], sectionCopyUpdates);
find(sectionCopyPage, 'CopyToClipboard')[0].props.onCopy();
assert.equal(sectionCopyUpdates.find(update => update.slot === 6)?.value, '', 'section copy clears heading query');
console.log('PASS: Enter navigation and copy/paste clear the current search');

})().catch(error => { console.error(error); process.exitCode = 1; });
