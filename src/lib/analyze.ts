import type { Language, ProjectFile } from "../types";

/* ------------------------------------------------------------------ */
/* Result types                                                        */
/* ------------------------------------------------------------------ */

export type Severity = "critical" | "warning" | "info";

export interface Finding {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  fix: string;
  /** Optional one-click code patch applied to the active file */
  applyFix?: (code: string) => string;
}

export interface AnalysisResult {
  status: "compatible" | "conflict";
  summary: string;
  findings: Finding[];
  checksRun: string[];
  durationMs: number;
  fileName: string;
}

export interface AnalyzeInput {
  file: ProjectFile;
  original: string;
  current: string;
  files: ProjectFile[];
  previewHtml: string;
}

/* ------------------------------------------------------------------ */
/* Small utilities                                                     */
/* ------------------------------------------------------------------ */

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ------------------------------------------------------------------ */
/* Syntax validation                                                   */
/* ------------------------------------------------------------------ */

function checkJsSyntax(code: string): string | null {
  let i = 0;
  const n = code.length;
  const stack: { ch: string; idx: number }[] = [];
  const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  let prevSig = "";

  while (i < n) {
    const c = code[i];

    if (c === "/" && code[i + 1] === "/") {
      while (i < n && code[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && code[i + 1] === "*") {
      i += 2;
      let closed = false;
      while (i < n) {
        if (code[i] === "*" && code[i + 1] === "/") { i += 2; closed = true; break; }
        i++;
      }
      if (!closed) return "Unterminated block comment";
      continue;
    }

    if (c === '"' || c === "'" || c === "`") {
      const q = c;
      i++;
      let closed = false;
      while (i < n) {
        if (code[i] === "\\") { i += 2; continue; }
        if (code[i] === q) { i++; closed = true; break; }
        if (q !== "`" && code[i] === "\n") return "Unterminated string literal";
        i++;
      }
      if (!closed) return q === "`" ? "Unterminated template literal" : "Unterminated string literal";
      prevSig = q;
      continue;
    }

    if (c === "/") {
      // Heuristic: regex if previous significant char is not alnum / ) / ]
      const regexStart = !/[A-Za-z0-9_$\)\]]/.test(prevSig);
      if (regexStart) {
        i++;
        let inClass = false;
        let closed = false;
        while (i < n) {
          const r = code[i];
          if (r === "\\") { i += 2; continue; }
          if (r === "[") inClass = true;
          else if (r === "]") inClass = false;
          else if (r === "/" && !inClass) { i++; closed = true; break; }
          else if (r === "\n") return "Unterminated regex literal";
          i++;
        }
        if (!closed) return "Unterminated regex literal";
        while (i < n && /[a-z]/i.test(code[i])) i++;
        prevSig = "/";
        continue;
      } else {
        prevSig = "/";
        i++;
        continue;
      }
    }

    if (c === "(" || c === "[" || c === "{") {
      stack.push({ ch: c, idx: i });
      prevSig = c;
      i++;
      continue;
    }
    if (c === ")" || c === "]" || c === "}") {
      const top = stack.pop();
      if (!top || top.ch !== pairs[c]) {
        return top
          ? `Mismatched '${c}' — expected '${pairs[top.ch] as string}' to close '${top.ch}' opened at index ${top.idx}`
          : `Mismatched '${c}' — no matching opener`;
      }
      prevSig = c;
      i++;
      continue;
    }

    if (/\s/.test(c)) { i++; continue; }
    prevSig = c;
    i++;
  }

  if (stack.length) {
    const top = stack[stack.length - 1];
    return `Unclosed '${top.ch}' opened at index ${top.idx}`;
  }
  return null;
}

function checkCssSyntax(code: string): string | null {
  let depth = 0;
  let i = 0;
  const n = code.length;
  while (i < n) {
    const c = code[i];
    if (c === "/" && code[i + 1] === "*") {
      i += 2;
      let closed = false;
      while (i < n) {
        if (code[i] === "*" && code[i + 1] === "/") { i += 2; closed = true; break; }
        i++;
      }
      if (!closed) return "Unterminated block comment";
      continue;
    }
    if (c === '"' || c === "'") {
      const q = c; i++;
      let closed = false;
      while (i < n) {
        if (code[i] === "\\") { i += 2; continue; }
        if (code[i] === q) { i++; closed = true; break; }
        i++;
      }
      if (!closed) return "Unterminated string literal";
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth < 0) return "Mismatched '}' — no matching '{'";
    }
    i++;
  }
  if (depth !== 0) return `Unclosed '{' — ${depth} block(s) not closed`;
  return null;
}

function checkSqlSyntax(code: string): string | null {
  let depth = 0;
  let i = 0;
  const n = code.length;
  while (i < n) {
    const c = code[i];
    if (c === "-" && code[i + 1] === "-") { while (i < n && code[i] !== "\n") i++; continue; }
    if (c === "'") {
      i++;
      let closed = false;
      while (i < n) {
        if (code[i] === "'" && code[i + 1] === "'") { i += 2; continue; }
        if (code[i] === "'") { i++; closed = true; break; }
        i++;
      }
      if (!closed) return "Unterminated string literal";
      continue;
    }
    if (c === "(") depth++;
    else if (c === ")") { depth--; if (depth < 0) return "Mismatched ')'"; }
    i++;
  }
  if (depth !== 0) return "Unbalanced parentheses";
  return null;
}

function checkHtmlSyntax(code: string): string | null {
  const re = /<([A-Za-z][\w-]*)([^>]*)>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    const attrs = m[2];
    // crude: ensure no nested '<' inside the tag
    if (attrs.includes("<")) return `Malformed tag <${m[1]}> — unexpected '<' inside tag`;
  }
  return null;
}

export function checkSyntax(code: string, language: Language): string | null {
  switch (language) {
    case "css": return checkCssSyntax(code);
    case "sql": return checkSqlSyntax(code);
    case "html": return checkHtmlSyntax(code);
    case "js":
    case "jsx":
    case "ts":
    default:
      return checkJsSyntax(code);
  }
}

/* ------------------------------------------------------------------ */
/* Static extraction                                                   */
/* ------------------------------------------------------------------ */

function extractExports(code: string): Set<string> {
  const names = new Set<string>();
  if (/export\s+default\b/.test(code)) names.add("default");
  let m: RegExpExecArray | null;
  const reFn = /export\s+(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/g;
  while ((m = reFn.exec(code))) names.add(m[1]);
  const reClass = /export\s+class\s+([A-Za-z_$][\w$]*)/g;
  while ((m = reClass.exec(code))) names.add(m[1]);
  const reVar = /export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g;
  while ((m = reVar.exec(code))) names.add(m[1]);
  const reBrace = /export\s*\{([^}]*)\}/g;
  while ((m = reBrace.exec(code))) {
    for (let part of m[1].split(",")) {
      part = part.trim();
      if (!part) continue;
      const as = part.split(/\s+as\s+/);
      names.add((as[1] || as[0]).trim());
    }
  }
  const reDest = /export\s+(?:const|let|var)\s*\{([^}]*)\}/g;
  while ((m = reDest.exec(code))) {
    for (let part of m[1].split(",")) {
      part = part.trim();
      if (!part) continue;
      const as = part.split(/\s+as\s+/);
      names.add((as[1] || as[0]).trim());
    }
  }
  return names;
}

export interface ImportClause {
  source: string;
  names: string[];
  defaultName?: string;
  namespace?: string;
}

function extractImports(code: string): ImportClause[] {
  const out: ImportClause[] = [];
  const re = /import\s+([^;'"]*?)\s+from\s*(['"])([^'"]+)\2/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    const clause = m[1].trim();
    const source = m[3];
    const names: string[] = [];
    let defaultName: string | undefined;
    let namespace: string | undefined;
    let rest = clause;
    const ns = rest.match(/\*\s*as\s+([\w$]+)/);
    if (ns) {
      namespace = ns[1];
      rest = rest.replace(ns[0], "").replace(/,\s*$/, "").trim();
    }
    const named = rest.match(/\{([^}]*)\}/);
    if (named) {
      for (let part of named[1].split(",")) {
        part = part.trim();
        if (!part) continue;
        const as = part.split(/\s+as\s+/);
        names.push((as[1] || as[0]).trim());
      }
      rest = rest.replace(named[0], "").replace(/,\s*$/, "").replace(/^\s*,/, "").trim();
    }
    if (rest) defaultName = rest.replace(/,/g, "").trim();
    out.push({ source, names, defaultName, namespace });
  }
  const reSide = /import\s*(['"])([^'"]+)\1/g;
  while ((m = reSide.exec(code))) {
    out.push({ source: m[2], names: [] });
  }
  return out;
}

function resolveModule(importerPath: string, source: string): string | null {
  if (!source.startsWith(".")) return null;
  const dir = importerPath.split("/").slice(0, -1);
  const stack = [...dir];
  for (const p of source.split("/")) {
    if (p === "" || p === ".") continue;
    if (p === "..") stack.pop();
    else stack.push(p);
  }
  return stack.join("/");
}

function extractCssClasses(css: string): Set<string> {
  const s = new Set<string>();
  const re = /\.([A-Za-z_][\w-]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) s.add(m[1]);
  return s;
}

function extractUsedClasses(html: string): Set<string> {
  const s = new Set<string>();
  const re = /class(?:Name)?\s*=\s*"([^"]*)"|class(?:Name)?\s*=\s*'([^']*)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const val = m[1] ?? m[2] ?? "";
    for (const c of val.split(/\s+/)) if (c) s.add(c);
  }
  return s;
}

function extractEndpoints(code: string): Set<string> {
  const s = new Set<string>();
  const re = /(['"`])(\/api\/[^'"`]*|https?:\/\/[^'"`]*)\1/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) s.add(m[2]);
  return s;
}

/* ------------------------------------------------------------------ */
/* Import fix builders                                                 */
/* ------------------------------------------------------------------ */

function replaceImportForSource(code: string, source: string, newStatement: string): string {
  const re = new RegExp(
    `import\\s+[^'";]*?\\s+from\\s*(['"])${escapeRegExp(source)}\\1\\s*;?`,
    "g"
  );
  if (re.test(code)) return code.replace(re, newStatement);
  const re2 = new RegExp(`import\\s*(['"])${escapeRegExp(source)}\\1\\s*;?`, "g");
  return code.replace(re2, newStatement);
}

function fixNamedImport(imp: ImportClause, badName: string): string {
  const names = imp.names.filter((n) => n !== badName);
  const parts: string[] = [];
  if (imp.defaultName) parts.push(imp.defaultName);
  if (names.length) parts.push("{ " + names.join(", ") + " }");
  if (imp.namespace) parts.push("* as " + imp.namespace);
  if (!parts.length) return `import '${imp.source}';`;
  return `import ${parts.join(", ")} from '${imp.source}';`;
}

function fixDefaultImport(imp: ImportClause, targetExports: Set<string>): string {
  const valid = [...targetExports].filter((e) => e !== "default");
  if (valid.length) return `import { ${valid[0]} } from '${imp.source}';`;
  return `import '${imp.source}';`;
}

/* ------------------------------------------------------------------ */
/* Main analysis                                                       */
/* ------------------------------------------------------------------ */

export function analyzeIntegration(input: AnalyzeInput): AnalysisResult {
  const { file, original, current, files, previewHtml } = input;
  const findings: Finding[] = [];
  const checksRun: string[] = [];
  const t0 = performance.now();

  const findFileByResolved = (resolved: string | null): ProjectFile | undefined => {
    if (!resolved) return undefined;
    return (
      files.find((f) => f.path === resolved) ||
      files.find((f) => f.path.replace(/\.[^.]+$/, "") === resolved)
    );
  };

  /* 1. Syntax -------------------------------------------------------- */
  checksRun.push("Syntax validation");
  const syntaxErr = checkSyntax(current, file.language);
  if (syntaxErr) {
    findings.push({
      id: "syntax",
      severity: "critical",
      title: `Syntax error in ${file.name}`,
      detail: syntaxErr,
      fix: "Fix the syntax error above, then re-run the integration test.",
    });
  }

  /* 2. Export contract ---------------------------------------------- */
  checksRun.push("Export contract analysis");
  const origExports = extractExports(original);
  const currExports = extractExports(current);
  const removedExports = [...origExports].filter((e) => !currExports.has(e));
  const addedExports = [...currExports].filter((e) => !origExports.has(e));

  for (const name of removedExports) {
    const importers: string[] = [];
    for (const f of files) {
      if (f.id === file.id) continue;
      for (const imp of extractImports(f.content)) {
        const target = findFileByResolved(resolveModule(f.path, imp.source));
        if (!target || target.id !== file.id) continue;
        if (name === "default") {
          if (imp.defaultName) importers.push(f.name);
        } else if (imp.names.includes(name)) {
          importers.push(f.name);
        }
      }
    }
    if (importers.length) {
      findings.push({
        id: "export-removed-" + name,
        severity: "critical",
        title: `Removed export "${name}" breaks ${importers.length} importer${importers.length > 1 ? "s" : ""}`,
        detail: `${file.name} no longer exports "${name}", but it is imported by: ${[...new Set(importers)].join(", ")}.`,
        fix: `Re-add the export "${name}" to ${file.name}, or update the importers to use a different export.`,
        applyFix:
          name === "default"
            ? (code) =>
                code.replace(/\s*$/, "") +
                `\n\nexport default function Restored() {\n  throw new Error('restored default export');\n}\n`
            : (code) =>
                code.replace(/\s*$/, "") + `\n\nexport const ${name} = null; // restored export\n`,
      });
    } else {
      findings.push({
        id: "export-removed-unused-" + name,
        severity: "warning",
        title: `Export "${name}" was removed`,
        detail: `No project file imports "${name}", so this is safe within the project — but external consumers may break.`,
        fix: "No action required for this project.",
      });
    }
  }
  for (const name of addedExports) {
    findings.push({
      id: "export-added-" + name,
      severity: "info",
      title: `New export "${name}" added`,
      detail: `Backward-compatible addition to ${file.name}.`,
      fix: "No action needed.",
    });
  }

  /* 3. Import resolution -------------------------------------------- */
  checksRun.push("Import resolution");
  const imps = extractImports(current);
  let resolvedCount = 0;
  for (const imp of imps) {
    const target = findFileByResolved(resolveModule(file.path, imp.source));
    if (!target) {
      if (!imp.source.startsWith(".")) {
        findings.push({
          id: "ext-" + imp.source + resolvedCount,
          severity: "info",
          title: `External dependency "${imp.source}"`,
          detail: "Resolved from the package registry (outside the project graph).",
          fix: "No action needed.",
        });
      } else {
        findings.push({
          id: "unresolved-" + imp.source + resolvedCount,
          severity: "warning",
          title: `Unresolved module "${imp.source}"`,
          detail: `Could not resolve "${imp.source}" from ${file.path}.`,
          fix: "Check the import path spelling.",
        });
      }
      continue;
    }
    resolvedCount++;
    const targetExports = extractExports(target.content);
    if (imp.defaultName && !targetExports.has("default")) {
      findings.push({
        id: "imp-default-" + target.name + resolvedCount,
        severity: "critical",
        title: `Default import not exported by ${target.name}`,
        detail: `${file.name} imports a default export from "${imp.source}", but ${target.name} has no default export.`,
        fix: `Add a default export to ${target.name}, or switch to a named import.`,
        applyFix: (code) =>
          replaceImportForSource(code, imp.source, fixDefaultImport(imp, targetExports)),
      });
    }
    for (const name of imp.names) {
      if (!targetExports.has(name)) {
        findings.push({
          id: "imp-name-" + target.name + name,
          severity: "critical",
          title: `"${name}" is not exported by ${target.name}`,
          detail: `${file.name} imports { ${name} } from "${imp.source}", but ${target.name} does not export it.`,
          fix: `Import an existing export from ${target.name} (available: ${[...targetExports].join(", ") || "none"}) or add the export.`,
          applyFix: (code) =>
            replaceImportForSource(code, imp.source, fixNamedImport(imp, name)),
        });
      }
    }
  }

  /* 4. Stylesheet contract ------------------------------------------ */
  if (file.language === "css") {
    checksRun.push("Stylesheet contract analysis");
    const origClasses = extractCssClasses(original);
    const currClasses = extractCssClasses(current);
    const used = extractUsedClasses(previewHtml);
    const removedClasses = [...origClasses].filter((c) => !currClasses.has(c));
    for (const c of removedClasses) {
      if (used.has(c)) {
        findings.push({
          id: "css-removed-" + c,
          severity: "critical",
          title: `Removed class ".${c}" is still used in the UI`,
          detail: `The selector ".${c}" was removed from ${file.name}, but it is referenced in index.html. The element will lose its styling.`,
          fix: `Re-add the ".${c}" rule, or update index.html to use a different class.`,
          applyFix: (code) =>
            code.replace(/\s*$/, "") + `\n\n.${c} {\n  /* restored */\n}\n`,
        });
      } else {
        findings.push({
          id: "css-removed-unused-" + c,
          severity: "warning",
          title: `Removed class ".${c}"`,
          detail: "No reference found in the current UI markup.",
          fix: "No action needed.",
        });
      }
    }
    const addedClasses = [...currClasses].filter((c) => !origClasses.has(c));
    for (const c of addedClasses) {
      findings.push({
        id: "css-added-" + c,
        severity: "info",
        title: `New class ".${c}" defined`,
        detail: "Available for use in markup.",
        fix: "No action needed.",
      });
    }
  }

  /* 5. API contract -------------------------------------------------- */
  checksRun.push("API contract analysis");
  const origEndpoints = extractEndpoints(original);
  const currEndpoints = extractEndpoints(current);
  const removedEndpoints = [...origEndpoints].filter((e) => !currEndpoints.has(e));
  if (file.language === "js" || file.language === "jsx" || file.language === "ts") {
    for (const ep of removedEndpoints) {
      const callers: string[] = [];
      for (const f of files) {
        if (f.id === file.id) continue;
        if (extractEndpoints(f.content).has(ep)) callers.push(f.name);
      }
      if (callers.length) {
        findings.push({
          id: "ep-removed-" + ep,
          severity: "critical",
          title: `Removed endpoint "${ep}" still called by ${callers.length} file(s)`,
          detail: `${file.name} no longer references "${ep}", but it is still used by: ${[...new Set(callers)].join(", ")}.`,
          fix: "Restore the endpoint string or update the callers.",
        });
      }
    }
  }

  /* Positive confirmations when no criticals ------------------------ */
  const hasCritical = findings.some((f) => f.severity === "critical");
  if (!hasCritical) {
    findings.push({
      id: "pos-imports",
      severity: "info",
      title: `${resolvedCount} local import(s) resolved`,
      detail: "All local imports resolve to project modules with valid exports.",
      fix: "No action needed.",
    });
    if (removedExports.length === 0) {
      findings.push({
        id: "pos-exports",
        severity: "info",
        title: "No breaking export changes",
        detail: `Export surface of ${file.name} is unchanged.`,
        fix: "No action needed.",
      });
    }
    if (file.language === "css" && !findings.some((f) => f.id.startsWith("css-removed-"))) {
      findings.push({
        id: "pos-css",
        severity: "info",
        title: "Stylesheet contract intact",
        detail: "All classes referenced by the UI are defined.",
        fix: "No action needed.",
      });
    }
  }

  const status: AnalysisResult["status"] = hasCritical ? "conflict" : "compatible";
  const warnings = findings.filter((f) => f.severity === "warning").length;
  const criticals = findings.filter((f) => f.severity === "critical").length;
  const summary = hasCritical
    ? `Integration check failed — ${criticals} breaking issue(s) detected in ${file.name}.`
    : warnings
      ? `Compatible with ${warnings} warning(s). ${file.name} integrates smoothly.`
      : `${file.name} integrates smoothly with the rest of the system.`;

  return {
    status,
    summary,
    findings,
    checksRun: [...new Set(checksRun)],
    durationMs: Math.round(performance.now() - t0),
    fileName: file.name,
  };
}

export const ANALYSIS_STEPS = [
  "Parsing modified file…",
  "Building module graph…",
  "Checking export contracts…",
  "Validating imports & API calls…",
  "Rendering UI sandbox…",
  "Finalizing report…",
];
