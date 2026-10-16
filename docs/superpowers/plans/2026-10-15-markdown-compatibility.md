# Markdown compatibility scope

Confirmed against Tinycast v0.11.19 ExtensionDetailView.swift and the user's Vim/Redis documents.

## Extension-only adaptation

- Add a pure display adapter between section extraction and List.Item.Detail.
- Recognize tables through their header separator and add optional leading/trailing pipes. Preserve escaped pipes and inline code.
- Hide HTML comments outside fenced and inline code, including rehype layout directives.
- Preserve ordinary Markdown lists, links, emphasis, images and fenced code. Keep raw Markdown for copy actions and leave source documents unchanged.
- Memoize the adapted selected section, preserving the existing performance improvements.
- Test real Vim/Redis samples, escaped pipes, multiline comments, and code containing apparent tables/comments. Rebuild and deploy only after checks pass.

## Native renderer boundary

The current renderer flattens list indentation, renumbers ordered lists, has no task-list model, and handles only a limited subset of block syntax. Extension text normalization cannot provide full Markdown semantics for these constructs. A full renderer change would affect Tinycast itself and requires the user's scope choice before implementation.
