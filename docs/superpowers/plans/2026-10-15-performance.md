# Cheatsheets performance implementation plan

Goal: reduce Tinycast render payload while preserving full-text search, filters, navigation and copy actions.

1. Add regression coverage for cached case-insensitive full-text search, multi-term queries, Chinese text, and metadata.
2. Cache each document's normalized search text with a WeakMap; search locally with controlled List search, and remove full-body native keywords.
3. Track the highlighted document; mount document copy actions only for that row.
4. Memoize the selected section once; mount detail and copy actions only on the highlighted heading.
5. Run existing filter regression, new search and render tests, TypeScript, and production build. Measure payload reduction on the actual docs.
6. Deploy, remove temporary Raycast config if empty, and verify list, search and heading navigation in Tinycast.

Constraints: no Tinycast binary changes, no new dependencies, no document edits, preserve existing extension identity and preferences.
