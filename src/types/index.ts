export interface SnippetContent {
  title?: string;
  description?: string;
  aliases?: string[];
  tags: string[];
  content: string;
  rawMetadata: string;
}

export interface Snippet {
  fullPath?: string;
  id: string;
  name: string;
  folder: string;
  content: SnippetContent;
}

export interface State {
  snippets?: Snippet[];
  filteredSnippets?: Snippet[];
  folders?: string[];
  tags?: string[];
  errors?: Error[];
  isLoading: boolean;
  selectedFilter?: string;
  primaryAction?: string;
  paths?: string[];
}

export interface Heading {
  rawText?: string;
  bodyStartIndex?: number;
  previewEndIndex?: number;
  level: number;
  text: string;
  startIndex: number;
  endIndex: number;
  id: string;
}
