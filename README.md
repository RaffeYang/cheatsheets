# Cheatsheets

Cheatsheets for everyday

## How to use

```bash
npm install && npm run dev
```

## Add Cheatsheet
[Cheatsheet Doc](https://github.com/RaffeYang/cheatsheets-doc)

## License
[Apache](LICENSE)
## Search and reading

- Search titles, tags and document text with live fuzzy matching. Common Chinese aliases are included.
- Add custom aliases through Markdown frontmatter: `aliases: [别名, shortcut]`.
- Use **Favorite Document** and the **Favorites** filter for frequent references.
- Use **Bookmark Section** and **Bookmarked Sections** in Actions to jump between saved sections.
- Enter actions clear the current search. Back preserves the document list filter and selection. Reopening a document restores its last heading with an empty search and the complete outline.
- Reading restores the selected heading; pixel scroll position depends on the host app.
- Reload checks file modification time and size, reuses unchanged files and reports individual unreadable files.
- The optional primary action preference makes Copy or Paste the first action in the document list.

## Validation

```bash
npm test
npx tsc --noEmit
npm run build
```
