import { Action, ActionPanel, Icon } from "@raycast/api";
import * as path from "path";
import type { Snippet } from "../types";
import { getPastableContent } from "../utils/SnippetsLoader";

type ContentProps = { snippet: Snippet; primaryAction: string; handleAction: (s: Snippet) => void };
export function SnippetContentActions({ snippet, primaryAction, handleAction }: ContentProps) {
  const content = getPastableContent(snippet.content.content);
  const copy = (
    <Action.CopyToClipboard
      key="copy"
      title="Copy Content"
      content={content}
      shortcut={{ modifiers: ["cmd"], key: "c" }}
      onCopy={() => handleAction(snippet)}
    />
  );
  const paste = (
    <Action.Paste
      key="paste"
      title="Paste to Active App"
      content={content}
      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
      onPaste={() => handleAction(snippet)}
    />
  );
  return <>{primaryAction === "pasteToActiveApp" ? [paste, copy] : [copy, paste]}</>;
}

export default function CustomActionPanel({
  handleAction,
  snippet,
  primaryAction,
  reloadSnippets,
  paths,
  showContentActions = true,
}: ContentProps & {
  reloadSnippets: () => void;
  paths: string[];
  showContentActions?: boolean;
}) {
  return (
    <>
      <ActionPanel.Section title="Actions">
        {showContentActions && (
          <SnippetContentActions snippet={snippet} primaryAction={primaryAction} handleAction={handleAction} />
        )}
        {snippet.fullPath && (
          <Action.ShowInFinder
            title="Open in Finder"
            path={snippet.fullPath}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section title="Others">
        <Action
          title="Reload Snippets"
          icon={Icon.RotateAntiClockwise}
          onAction={reloadSnippets}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
        />
        {paths.map((folder, index) => (
          <Action.OpenWith
            key={folder}
            title={
              index === 0 ? "Open Primary Snippets Folder" : `Open Secondary Snippets Folder ${path.basename(folder)}`
            }
            path={folder}
          />
        ))}
      </ActionPanel.Section>
    </>
  );
}
