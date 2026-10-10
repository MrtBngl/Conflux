import type { Category, Language, ProjectFile } from "../types";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const EXT_TO_LANGUAGE: Record<string, Language> = {
  ".jsx": "jsx",
  ".js": "js",
  ".ts": "ts",
  ".tsx": "jsx",
  ".css": "css",
  ".html": "html",
  ".htm": "html",
  ".sql": "sql",
};

const SUPPORTED_EXTENSIONS = new Set(Object.keys(EXT_TO_LANGUAGE));

export function detectLanguage(filename: string): Language {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  return EXT_TO_LANGUAGE[ext] ?? "js";
}

export function detectCategory(filename: string): Category {
  const lower = filename.toLowerCase();
  if (lower.includes("auth") || lower.includes("login") || lower.includes("session"))
    return "Auth";
  if (lower.includes("pay") || lower.includes("stripe") || lower.includes("billing"))
    return "Payment";
  if (lower.includes("db") || lower.includes("database") || lower.includes("query") || lower.includes("migration"))
    return "Database";
  if (lower.includes("checkout") || lower.includes("cart") || lower.includes("order"))
    return "Checkout";
  return "UI";
}

export function isSupportedFile(filename: string): boolean {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  return SUPPORTED_EXTENSIONS.has(ext);
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/**
 * Normalise the path reported by the browser.
 * `webkitRelativePath` usually gives "folderName/sub/file.js".
 * We strip the leading root folder so paths look like "sub/file.js".
 */
function normalisePath(file: File): string {
  const rel = (file as { webkitRelativePath?: string }).webkitRelativePath;
  if (rel) {
    // Drop the first segment (the picked folder name itself)
    const parts = rel.split("/");
    return parts.length > 1 ? parts.slice(1).join("/") : rel;
  }
  return file.name;
}

/* ------------------------------------------------------------------ */
/* Main entry                                                          */
/* ------------------------------------------------------------------ */

export async function processUploadedFiles(fileList: FileList): Promise<ProjectFile[]> {
  const files = Array.from(fileList).filter((f) => isSupportedFile(f.name));

  const results: ProjectFile[] = [];
  for (const file of files) {
    const content = await readFileAsText(file);
    const path = normalisePath(file);
    const name = file.name;
    const language = detectLanguage(name);
    const category = detectCategory(path);
    results.push({
      id: path,
      name,
      path,
      language,
      category,
      content,
      originalContent: content,
    });
  }

  return results;
}
