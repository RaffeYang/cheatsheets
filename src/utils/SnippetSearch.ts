import type { Snippet } from "../types";

interface SearchEntry {
  title: string;
  fields: string[];
  text: string;
  words?: Map<number, string[]>;
  scores: Map<string, number>;
}

// Curated aliases are searchable metadata, not extra native List keyword payload.
export const documentAliases: Record<string, string[]> = {
  uv: ["虚拟环境", "包管理", "依赖管理", "项目管理"],
  rust: ["所有权", "借用", "生命周期", "生存期", "货运"],
  python: ["蟒蛇", "脚本", "数据分析"],
  swift: ["苹果开发", "可选类型"],
  swiftui: ["苹果界面", "声明式界面"],
  git: ["版本控制", "提交", "分支", "合并"],
  github: ["代码托管", "仓库"],
  githubcli: ["命令行", "代码托管"],
  vim: ["编辑器", "快捷键", "模式编辑"],
  regex: ["正则", "正则表达式"],
  markdown: ["标记语言", "排版"],
  mysql: ["数据库", "关系数据库"],
  sqlite: ["数据库", "本地数据库"],
  redis: ["缓存", "键值数据库"],
  nginx: ["反向代理", "网页服务器"],
  bash: ["终端", "命令行", "脚本"],
  homebrew: ["软件安装", "包管理"],
  html: ["网页", "标签"],
  css: ["网页样式", "样式表"],
  typescript: ["类型脚本", "前端"],
  react: ["组件", "前端框架"],
};

const searchIndex = new WeakMap<Snippet, SearchEntry>();
const normalize = (text: string) => text.normalize("NFKC").toLowerCase();

function indexSnippet(snippet: Snippet): SearchEntry {
  let entry = searchIndex.get(snippet);
  if (!entry) {
    const title = normalize(snippet.name);
    const aliasKey = title.replace(/[\s._\/-]+/g, "");
    const fields = [
      snippet.folder,
      ...snippet.content.tags,
      ...(snippet.content.aliases ?? []),
      ...(documentAliases[aliasKey] ?? []),
    ].map(normalize);
    entry = {
      title,
      fields,
      text: normalize(
        [
          snippet.name,
          ...fields,
          snippet.content.description ?? "",
          snippet.content.rawMetadata,
          snippet.content.content,
        ].join("\n"),
      ),
      scores: new Map(),
    };
    searchIndex.set(snippet, entry);
  }
  return entry;
}

// Ordered characters may omit letters: pythn → python, ghcli → githubcli.
function fuzzyScore(term: string, candidate: string): number {
  if (candidate === term) return 0;
  const position = candidate.indexOf(term);
  if (position >= 0) return position === 0 ? 2 : 4;
  let cursor = 0;
  let first = -1;
  for (const character of term) {
    const index = candidate.indexOf(character, cursor);
    if (index < 0) return Infinity;
    if (first < 0) first = index;
    cursor = index + character.length;
  }
  return 8 + (cursor - first - term.length) / Math.max(candidate.length, 1);
}

function termScore(entry: SearchEntry, term: string): number {
  const cached = entry.scores.get(term);
  if (cached !== undefined) return cached;
  let score = Math.min(fuzzyScore(term, entry.title), fuzzyScore(term, entry.title.replace(/[\s._\/-]+/g, "")));
  for (const field of entry.fields) score = Math.min(score, 16 + fuzzyScore(term, field));
  if (entry.text.includes(term)) score = Math.min(score, 32);
  if (!Number.isFinite(score) && term.length > 1) {
    if (!entry.words) {
      const buckets = new Map<number, string[]>();
      for (const word of new Set(entry.text.match(/[\p{L}\p{N}_]+/gu) ?? [])) {
        const bucket = buckets.get(word.length) ?? [];
        bucket.push(word);
        buckets.set(word.length, bucket);
      }
      entry.words = buckets;
    }
    // Bound both scan cost and accidental matches against very long tokens.
    for (let length = term.length; length <= term.length * 2 + 4; length++) {
      for (const word of entry.words.get(length) ?? []) {
        score = Math.min(score, 64 + fuzzyScore(term, word));
      }
    }
  }
  if (entry.scores.size >= 64) entry.scores.clear();
  entry.scores.set(term, score);
  return score;
}

export function searchSnippets(snippets: Snippet[], query: string): Snippet[] {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return snippets;
  return snippets
    .map((snippet, index) => {
      const entry = indexSnippet(snippet);
      let score = 0;
      for (const term of terms) {
        const match = termScore(entry, term);
        if (!Number.isFinite(match)) return { snippet, index, score: Infinity };
        score += match;
      }
      return { snippet, index, score };
    })
    .filter((result) => Number.isFinite(result.score))
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map((result) => result.snippet);
}
