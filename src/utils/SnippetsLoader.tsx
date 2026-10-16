import { LocalStorage } from "@raycast/api";
import * as fs from "fs";
import os from "os";
import * as path from "path";

import type { Snippet } from "../types";
import loadMarkdown from "./MarkdownLoader";

const supportedExtensions = [".md", ".txt"];
// 添加要排除的文件名列表
const excludedFileNames = ["README.md", "readme.md", "Readme.md"];

type CacheEntry = { mtimeMs: number; size: number; snippet: Snippet };
const cache = new Map<string, CacheEntry>();
const concurrency = 8;
let hydrated: Promise<void> | undefined;
let persistence: Promise<void> = Promise.resolve();
let persistedSnapshot: string | undefined;
async function hydrateCache() {
  if (!hydrated)
    hydrated = (async () => {
      try {
        const raw = await LocalStorage.getItem<string>("snippetCacheV1");
        const entries: unknown = JSON.parse(raw ?? "[]");
        persistedSnapshot = raw;
        if (!Array.isArray(entries)) return;
        for (const item of entries) {
          if (!Array.isArray(item) || item.length !== 2) continue;
          const [key, value] = item;
          if (
            typeof key === "string" &&
            path.isAbsolute(key) &&
            value &&
            typeof value.mtimeMs === "number" &&
            typeof value.size === "number" &&
            value.snippet?.fullPath === key &&
            typeof value.snippet.id === "string" &&
            typeof value.snippet.name === "string" &&
            typeof value.snippet.folder === "string" &&
            typeof value.snippet.content?.content === "string" &&
            Array.isArray(value.snippet.content.tags)
          )
            cache.set(key, value);
        }
      } catch {
        /* A stale or corrupt cache must never prevent reading documents. */
      }
    })();
  await hydrated;
}

async function loadAllSnippets(startPath: string): Promise<{ snippets: Snippet[]; errors: Error[] }> {
  await hydrateCache();
  const root = path.resolve(expandHomeDirectory(startPath));
  const snippets: Snippet[] = [];
  const errors: Error[] = [];
  const files: string[] = [];
  const directories = [root];
  const seen = new Set<string>();
  const asError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

  // A fixed worker pool bounds filesystem operations even for very large trees.
  async function run(items: string[], work: (item: string) => Promise<void>) {
    let index = 0;
    await Promise.all(
      Array.from({ length: Math.min(concurrency, items.length) }, async () => {
        while (index < items.length) {
          const item = items[index++];
          try {
            await work(item);
          } catch (error) {
            errors.push(asError(error));
          }
        }
      }),
    );
  }
  while (directories.length) {
    const batch = directories.splice(0);
    await run(batch, async (directory) => {
      const entries = await fs.promises.readdir(directory, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith(".")) continue;
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) directories.push(fullPath);
        else if (supportedExtensions.includes(path.extname(entry.name)) && !excludedFileNames.includes(entry.name))
          files.push(fullPath);
      }
    });
  }
  await run(files.sort(), async (fullPath) => {
    seen.add(fullPath);
    const stat = await fs.promises.stat(fullPath);
    const previous = cache.get(fullPath);
    if (
      previous &&
      previous.mtimeMs === stat.mtimeMs &&
      previous.size === stat.size &&
      previous.snippet.folder === path.dirname(path.relative(root, fullPath))
    ) {
      snippets.push(previous.snippet);
      return;
    }
    cache.delete(fullPath);
    const { snippet, error } = await loadMarkdown(path.relative(root, fullPath), fullPath);
    if (error) errors.push(error);
    else cache.set(fullPath, { mtimeMs: stat.mtimeMs, size: stat.size, snippet });
    snippets.push(snippet);
  });
  for (const fullPath of cache.keys()) {
    const relative = path.relative(root, fullPath);
    if (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative) && !seen.has(fullPath))
      cache.delete(fullPath);
  }
  snippets.sort((a, b) => (a.fullPath ?? "").localeCompare(b.fullPath ?? ""));
  const snapshot = JSON.stringify([...cache]);
  persistence = persistence
    .catch(() => undefined)
    .then(async () => {
      try {
        if (snapshot !== persistedSnapshot) {
          await LocalStorage.setItem("snippetCacheV1", snapshot);
          persistedSnapshot = snapshot;
        }
      } catch {
        /* Cache persistence is optional. */
      }
    });
  await persistence;
  return { snippets, errors };
}

function expandHomeDirectory(dirPath: string): string {
  if (dirPath.startsWith("~")) {
    return path.join(os.homedir(), dirPath.slice(1));
  } else {
    return dirPath;
  }
}

function getPastableContent(content: string): string {
  if (!content) {
    return "";
  }

  let pastableContent = content;
  if (content.startsWith("```") && content.endsWith("```")) {
    const tmp = content.split("\n");
    const extractedLines = tmp.slice(1, tmp.length - 1);
    pastableContent = extractedLines.join("\n");
  }
  return pastableContent;
}

export { expandHomeDirectory, getPastableContent, loadAllSnippets };
