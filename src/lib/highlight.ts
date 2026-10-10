import type { Language } from "../types";

export interface Token {
  text: string;
  cls?: string;
}

/* ------------------------------------------------------------------ */
/* JavaScript / JSX / TypeScript                                       */
/* ------------------------------------------------------------------ */

const JS_KEYWORDS = new Set([
  "import", "from", "export", "default", "const", "let", "var", "function",
  "return", "if", "else", "for", "while", "do", "switch", "case", "break",
  "continue", "new", "class", "extends", "super", "this", "async", "await",
  "try", "catch", "finally", "throw", "typeof", "instanceof", "in", "of",
  "yield", "static", "get", "set", "void", "delete", "as", "satisfies",
]);

const JS_CONSTANTS = new Set(["true", "false", "null", "undefined", "NaN", "Infinity"]);

function tokenizeJs(codeStr: string): Token[] {
  const tokens: Token[] = [];
  const re =
    /(\/\/[^\n]*)|(\/\*[\s\S]*?\*\/)|(`(?:\\[\s\S]|[^`\\])*`|'(?:\\[\s\S]|[^'\\])*'|"(?:\\[\s\S]|[^"\\])*")|(\b0[xX][0-9a-fA-F]+\b|\b\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|([A-Za-z_$][\w$]*)|(<\/?[A-Za-z][\w-]*)|(\s+)|(.)/g;
  let m: RegExpExecArray | null;
  let lastEnd = 0;
  while ((m = re.exec(codeStr))) {
    if (m.index > lastEnd) {
      tokens.push({ text: codeStr.slice(lastEnd, m.index) });
    }
    lastEnd = re.lastIndex;
    const [full, lineCom, blockCom, str, num, word, tag, ws] = m;
    if (lineCom || blockCom) tokens.push({ text: full, cls: "text-zinc-500 italic" });
    else if (str) tokens.push({ text: full, cls: "text-emerald-300" });
    else if (num) tokens.push({ text: full, cls: "text-amber-400" });
    else if (word) {
      if (JS_KEYWORDS.has(word)) tokens.push({ text: full, cls: "text-violet-400" });
      else if (JS_CONSTANTS.has(word)) tokens.push({ text: full, cls: "text-pink-400" });
      else if (/^[A-Z]/.test(word)) tokens.push({ text: full, cls: "text-amber-300" });
      else {
        // function call?
        let j = re.lastIndex;
        while (j < codeStr.length && /\s/.test(codeStr[j])) j++;
        if (codeStr[j] === "(") tokens.push({ text: full, cls: "text-sky-300" });
        else tokens.push({ text: full });
      }
    } else if (tag) tokens.push({ text: full, cls: "text-pink-400" });
    else if (ws) tokens.push({ text: full });
    else tokens.push({ text: full, cls: "text-zinc-400" });
  }
  if (lastEnd < codeStr.length) tokens.push({ text: codeStr.slice(lastEnd) });
  return tokens;
}

/* ------------------------------------------------------------------ */
/* CSS                                                                 */
/* ------------------------------------------------------------------ */

function tokenizeCss(codeStr: string): Token[] {
  const tokens: Token[] = [];
  const re =
    /(\/\*[\s\S]*?\*\/)|("(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*')|(#[0-9a-fA-F]{3,8}\b)|(-?\d*\.?\d+(?:px|rem|em|%|vh|vw|vmin|vmax|s|ms|fr|ch|ex)?\b)|(@[a-zA-Z-]+)|([a-zA-Z-]+)(?=\s*:)|(\.[a-zA-Z_][\w-]*)|(#[a-zA-Z_][\w-]*)|(::?[a-zA-Z-]+)|([{}();:,>+~*\/=[\]])|([a-zA-Z-]+)|(\s+)|(.)/g;
  let m: RegExpExecArray | null;
  let lastEnd = 0;
  while ((m = re.exec(codeStr))) {
    if (m.index > lastEnd) tokens.push({ text: codeStr.slice(lastEnd, m.index) });
    lastEnd = re.lastIndex;
    const [full, com, str, hex, num, at, prop, cls, id, pseudo, punct, word, ws] = m;
    if (com) tokens.push({ text: full, cls: "text-zinc-500 italic" });
    else if (str) tokens.push({ text: full, cls: "text-emerald-300" });
    else if (hex) tokens.push({ text: full, cls: "text-amber-400" });
    else if (num) tokens.push({ text: full, cls: "text-amber-400" });
    else if (at) tokens.push({ text: full, cls: "text-violet-400" });
    else if (prop) tokens.push({ text: full, cls: "text-indigo-300" });
    else if (cls) tokens.push({ text: full, cls: "text-violet-300" });
    else if (id) tokens.push({ text: full, cls: "text-rose-300" });
    else if (pseudo) tokens.push({ text: full, cls: "text-sky-300" });
    else if (punct) tokens.push({ text: full, cls: "text-zinc-400" });
    else if (word) tokens.push({ text: full, cls: "text-zinc-200" });
    else if (ws) tokens.push({ text: full });
    else tokens.push({ text: full, cls: "text-zinc-400" });
  }
  if (lastEnd < codeStr.length) tokens.push({ text: codeStr.slice(lastEnd) });
  return tokens;
}

/* ------------------------------------------------------------------ */
/* HTML                                                                */
/* ------------------------------------------------------------------ */

function tokenizeHtml(codeStr: string): Token[] {
  const tokens: Token[] = [];
  const re =
    /(<!--[\s\S]*?-->)|(<\/?[A-Za-z][\w-]*|\/?>)|("[^"]*"|'[^']*')|([A-Za-z-]+)(?=\s*=)|(\s+)|(.)/g;
  let m: RegExpExecArray | null;
  let lastEnd = 0;
  while ((m = re.exec(codeStr))) {
    if (m.index > lastEnd) tokens.push({ text: codeStr.slice(lastEnd, m.index) });
    lastEnd = re.lastIndex;
    const [full, com, tag, str, attr, ws] = m;
    if (com) tokens.push({ text: full, cls: "text-zinc-500 italic" });
    else if (tag) tokens.push({ text: full, cls: "text-pink-400" });
    else if (str) tokens.push({ text: full, cls: "text-emerald-300" });
    else if (attr) tokens.push({ text: full, cls: "text-indigo-300" });
    else if (ws) tokens.push({ text: full });
    else tokens.push({ text: full, cls: "text-zinc-300" });
  }
  if (lastEnd < codeStr.length) tokens.push({ text: codeStr.slice(lastEnd) });
  return tokens;
}

/* ------------------------------------------------------------------ */
/* SQL                                                                 */
/* ------------------------------------------------------------------ */

const SQL_KEYWORDS = new Set([
  "select", "insert", "update", "delete", "from", "where", "create", "table",
  "primary", "key", "references", "default", "not", "null", "unique", "integer",
  "varchar", "numeric", "timestamptz", "serial", "returning", "values", "and",
  "or", "as", "on", "join", "inner", "left", "right", "alter", "drop",
]);

function tokenizeSql(codeStr: string): Token[] {
  const tokens: Token[] = [];
  const re =
    /(--[^\n]*)|(\/\*[\s\S]*?\*\/)|('(?:''|[^'])*')|("[^"]*")|\b([A-Za-z_][\w]*)\b|(\b\d+\b)|(\s+)|(.)/g;
  let m: RegExpExecArray | null;
  let lastEnd = 0;
  while ((m = re.exec(codeStr))) {
    if (m.index > lastEnd) tokens.push({ text: codeStr.slice(lastEnd, m.index) });
    lastEnd = re.lastIndex;
    const [full, lineCom, blockCom, sq, dq, word, num, ws] = m;
    if (lineCom || blockCom) tokens.push({ text: full, cls: "text-zinc-500 italic" });
    else if (sq || dq) tokens.push({ text: full, cls: "text-emerald-300" });
    else if (word) {
      if (SQL_KEYWORDS.has(word.toLowerCase())) tokens.push({ text: full, cls: "text-violet-400" });
      else tokens.push({ text: full, cls: "text-sky-300" });
    } else if (num) tokens.push({ text: full, cls: "text-amber-400" });
    else if (ws) tokens.push({ text: full });
    else tokens.push({ text: full, cls: "text-zinc-400" });
  }
  if (lastEnd < codeStr.length) tokens.push({ text: codeStr.slice(lastEnd) });
  return tokens;
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export function highlight(codeStr: string, language: Language): Token[] {
  switch (language) {
    case "css":
      return tokenizeCss(codeStr);
    case "html":
      return tokenizeHtml(codeStr);
    case "sql":
      return tokenizeSql(codeStr);
    case "js":
    case "jsx":
    case "ts":
    default:
      return tokenizeJs(codeStr);
  }
}
