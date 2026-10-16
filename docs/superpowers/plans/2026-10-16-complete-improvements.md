# Complete improvements implementation plan

Goal: implement the approved correctness, reliability and reader improvements in both repositories.

- Heading module: parse original offsets, exclude fenced/indented code and comments, distinguish duplicate headings, preserve raw complete section copy and lightweight previews.
- Loader/storage: retain actual full paths, isolate individual file/directory errors, bound I/O concurrency, reuse unchanged parsed files by modification time/size, serialize and await history updates, sort copies.
- Reader: make copy/paste preference effective, preserve main query/filter/selection on back, persist recent chapter and section bookmarks/document favorites, expose favorite filtering and jump actions, normalize inline Markdown heading labels.
- Search: add maintained Chinese aliases for common documents and include them in cached fuzzy indexing.
- Docs: move Actions into .github/workflows, run offline quality tests before updates, report failed downloads with nonzero exit, validate/stage before atomic replacement, retain source metadata and naming, check links and code blocks, add Rust syntax smoke examples and official uv command references.
- Verification: regression tests for each behavior; all extension/doc tests, TypeScript and production build; read-only content checks; staged apply with backups and concurrent-change guards for the external docs repository; install and hash-check the final extension.

Constraints: preserve existing extension identity/preferences, no Tinycast binary changes, no loss of code examples, keep current lightweight native preview. Restore scroll via selected item/heading because no pixel-scroll API exists.
