import type { Heading } from "../types";

export function headingLabel(raw: string): string {
  return raw
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<\/?(?:pur|yel|red|span|code)\b[^>]*>/gi, "")
    .replace(/`+([^`]+)`+/g, "$1")
    .replace(/(\*\*|__|~~)(.*?)\1/g, "$2")
    .replace(/\\([\\`*{}\[\]()#+.!_<>|~-])/g, "$1")
    .trim();
}

export function extractHeadings(content: string): Heading[] {
  const headings: Heading[] = [];
  const occurrences = new Map<string, number>();
  let fence: { marker: string; length: number } | undefined;
  let comment = false;
  for (const match of content.matchAll(/[^\n]*(?:\n|$)/g)) {
    if (!match[0]) continue;
    const line = match[0].replace(/\r?\n$/, "");
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (fence) {
      if (marker && marker[1][0] === fence.marker && marker[1].length >= fence.length && !marker[2].trim())
        fence = undefined;
      continue;
    }
    if (!comment && marker) {
      fence = { marker: marker[1][0], length: marker[1].length };
      continue;
    }
    if (!comment && /^( {4}|\t)/.test(line)) continue;
    // Remove comments for recognition without changing the original source offsets.
    let visible = "";
    for (let i = 0; i < line.length; ) {
      if (comment) {
        const end = line.indexOf("-->", i);
        if (end < 0) break;
        comment = false;
        i = end + 3;
      } else if (line.startsWith("<!--", i)) {
        comment = true;
        i += 4;
      } else visible += line[i++];
    }
    const heading = visible.match(/^ {0,3}(#{1,3})[ \t]+(.+?)\s*$/);
    if (!heading) continue;
    const rawText = heading[2].replace(/[ \t]+#+[ \t]*$/, "").trim();
    const key = `${heading[1].length}:${rawText}`;
    const occurrence = occurrences.get(key) ?? 0;
    occurrences.set(key, occurrence + 1);
    headings.push({
      level: heading[1].length,
      text: headingLabel(rawText),
      rawText,
      startIndex: match.index!,
      bodyStartIndex: match.index! + match[0].length,
      endIndex: content.length,
      previewEndIndex: content.length,
      id: `heading:${heading[1].length}:${encodeURIComponent(rawText)}:${occurrence}`,
    });
  }
  const following: Heading[] = [];
  for (let i = headings.length - 1; i >= 0; i--) {
    headings[i].previewEndIndex = headings[i + 1]?.startIndex ?? content.length;
    while (following.length && following[following.length - 1].level > headings[i].level) following.pop();
    headings[i].endIndex = following[following.length - 1]?.startIndex ?? content.length;
    following.push(headings[i]);
  }
  return headings;
}

export function extractSectionContent(content: string, heading: Heading, previewOnly = false): string {
  // Fallback supports old persisted data/tests; live headings always carry source offsets.
  const resolved =
    Number.isFinite(heading.startIndex) && heading.previewEndIndex !== undefined
      ? heading
      : (extractHeadings(content).find((item) => item.id === heading.id) ??
        extractHeadings(content).find((item) => item.text === heading.text && item.level === heading.level));
  if (!resolved) return `# ${heading.text}\n\nSection not found.`;
  return content.slice(resolved.startIndex, previewOnly ? resolved.previewEndIndex : resolved.endIndex).trimEnd();
}
