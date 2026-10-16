// Normalize display text for Tinycast's native block renderer. Never mutate source/copy text.
interface DisplayLine {
  text: string
  literal: boolean
}

function displayLines(markdown: string): DisplayLine[] {
  let fence: { marker: string; length: number } | undefined
  let comment = false
  let inlineTicks = 0

  return markdown.replace(/\r\n/g, "\n").split("\n").map((line) => {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/)
    if (fence) {
      if (marker && marker[1][0] === fence.marker && marker[1].length >= fence.length && !marker[2].trim()) {
        fence = undefined
      }
      return { text: line, literal: true }
    }
    if (!comment && !inlineTicks && marker) {
      fence = { marker: marker[1][0], length: marker[1].length }
      return { text: line, literal: true }
    }
    if (!comment && !inlineTicks && /^( {4}|\t)/.test(line)) return { text: line, literal: true }

    let text = ""
    const literal = inlineTicks > 0
    for (let i = 0; i < line.length;) {
      if (comment) {
        const end = line.indexOf("-->", i)
        if (end === -1) break
        comment = false
        i = end + 3
      } else if (!inlineTicks && line.startsWith("<!--", i)) {
        comment = true
        i += 4
      } else if (line[i] === "`") {
        let end = i + 1
        while (line[end] === "`") end++
        const count = end - i
        if (!inlineTicks && (line.slice(end).match(/`+/g) ?? []).some((run) => run.length === count)) inlineTicks = count
        else if (inlineTicks === count) inlineTicks = 0
        text += line.slice(i, end)
        i = end
      } else {
        text += line[i++]
      }
    }
    return { text, literal: literal || inlineTicks > 0 }
  })
}

function cells(line: string): string[] | undefined {
  const parts: string[] = []
  let start = 0
  let slashes = 0
  for (let i = 0; i < line.length; i++) {
    if (line[i] === "|" && slashes % 2 === 0) {
      parts.push(line.slice(start, i).trim())
      start = i + 1
    }
    slashes = line[i] === "\\" ? slashes + 1 : 0
  }
  if (parts.length === 0) return undefined
  parts.push(line.slice(start).trim())
  if (!parts[0]) parts.shift()
  if (!parts[parts.length - 1]) parts.pop()
  return parts
}

export function adaptMarkdownForDisplay(markdown: string): string {
  const lines = displayLines(markdown)
  const output: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const header = !lines[i].literal ? cells(lines[i].text) : undefined
    const next = lines[i + 1]
    const separator = next && !next.literal ? cells(next.text) : undefined
    if (!header?.length || separator?.length !== header.length || !separator.every((cell) => /^:?-+:?$/.test(cell))) {
      output.push(lines[i].text)
      continue
    }

    if (output.length && output[output.length - 1].trim()) output.push("")
    output.push(`| ${header.join(" | ")} |`, `| ${separator.join(" | ")} |`)
    i += 2
    for (; i < lines.length && !lines[i].literal; i++) {
      const row = cells(lines[i].text)
      if (!row?.length) break
      output.push(`| ${row.join(" | ")} |`)
    }
    if (i < lines.length && lines[i].text.trim()) output.push("")
    i--
  }
  return output.join(markdown.includes("\r\n") ? "\r\n" : "\n")
}
