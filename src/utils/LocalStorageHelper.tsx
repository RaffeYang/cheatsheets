import { LocalStorage } from "@raycast/api";
import type { Snippet } from "../types";

let writes: Promise<void> = Promise.resolve();
function serialize(work: () => Promise<void>): Promise<void> {
  const next = writes.then(work, work);
  writes = next.catch(() => undefined);
  return next;
}
async function readObject(key: string): Promise<Record<string, unknown>> {
  const value = await LocalStorage.getItem<string>(key);
  try {
    const parsed = JSON.parse(value ?? "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
async function getLastCopiedMap(): Promise<Record<string, number>> {
  await writes;
  return readHistory();
}
async function readHistory(): Promise<Record<string, number>> {
  const raw = await readObject("lastCopiedMap");
  return Object.fromEntries(
    Object.entries(raw).filter(
      (entry): entry is [string, number] => typeof entry[1] === "number" && Number.isFinite(entry[1]),
    ),
  );
}
function storeLastCopied(snippet: Snippet): Promise<void> {
  return serialize(async () => {
    const map = await readHistory();
    map[snippet.id] = Date.now();
    await LocalStorage.setItem("lastCopiedMap", JSON.stringify(map));
  });
}
function clearUnusedSnippets(snippets: Snippet[]): Promise<void> {
  return serialize(async () => {
    const map = await readHistory();
    const keys = new Set(snippets.map((snippet) => snippet.id));
    for (const key of Object.keys(map)) if (!keys.has(key)) delete map[key];
    await LocalStorage.setItem("lastCopiedMap", JSON.stringify(map));
  });
}
async function orderSnippets(snippets: Snippet[]): Promise<Snippet[]> {
  if (!snippets) return snippets;
  const map = await getLastCopiedMap();
  return [...snippets].sort((a, b) => (map[b.id] || 0) - (map[a.id] || 0));
}
export type ReaderState = {
  favorites: string[];
  bookmarks: Record<string, string[]>;
  reading: Record<string, { headingId: string; headingSearch: string }>;
};
const strings = (value: unknown): string[] =>
  Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === "string"))] : [];
async function loadReaderState(): Promise<ReaderState> {
  await writes;
  const raw = await readObject("readerState");
  const bookmarks: ReaderState["bookmarks"] = {};
  const reading: ReaderState["reading"] = {};
  if (raw.bookmarks && typeof raw.bookmarks === "object" && !Array.isArray(raw.bookmarks)) {
    for (const [key, value] of Object.entries(raw.bookmarks))
      Object.defineProperty(bookmarks, key, {
        value: strings(value),
        enumerable: true,
        writable: true,
        configurable: true,
      });
  }
  if (raw.reading && typeof raw.reading === "object" && !Array.isArray(raw.reading)) {
    for (const [key, value] of Object.entries(raw.reading)) {
      if (
        value &&
        typeof value === "object" &&
        typeof value.headingId === "string" &&
        typeof value.headingSearch === "string"
      ) {
        Object.defineProperty(reading, key, {
          value: { headingId: value.headingId, headingSearch: value.headingSearch },
          enumerable: true,
          writable: true,
          configurable: true,
        });
      }
    }
  }
  return { favorites: strings(raw.favorites), bookmarks, reading };
}
function saveReaderState(state: ReaderState): Promise<void> {
  const snapshot = JSON.stringify(state);
  return serialize(async () => {
    await LocalStorage.setItem("readerState", snapshot);
  });
}
export { storeLastCopied, getLastCopiedMap, clearUnusedSnippets, orderSnippets, loadReaderState, saveReaderState };
