import type { Category, Language, ProjectFile } from "../types";

const EXT_LANG: Record<string, Language> = {
  jsx: "jsx",
  js: "js",
  ts: "ts",
  css: "css",
  html: "html",
  htm: "html",
  sql: "sql",
};

const ACCEPTED = new Set(Object.keys(EXT_LANG));

export function inferLanguage(fileName: string): Language | null {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  if (ext === "tsx") return "jsx";
  return EXT_LANG[ext] ?? null;
}

export function inferCategory(relativePath: string, fileName: string): Category {
  const p = relativePath.toLowerCase();
  const n = fileName.toLowerCase();

  if (n.endsWith(".sql") || p.includes("/db/") || p.includes("database") || p.includes("/schema")) {
    return "Database";
  }
  if (p.includes("auth") || p.includes("session") || p.includes("login") || p.includes("signup")) {
    return "Auth";
  }
  if (p.includes("payment") || p.includes("pay") || p.includes("stripe") || p.includes("billing")) {
    return "Payment";
  }
  if (p.includes("checkout") || p.includes("cart") || p.includes("order")) {
    return "Checkout";
  }
  if (n.endsWith(".css") || n.endsWith(".html") || p.includes("/ui/") || p.includes("/styles/")) {
    return "UI";
  }
  if (p.includes("component") || p.includes("/components/")) {
    return "UI";
  }
  return "Checkout";
}

export async function importProjectFromFileList(fileList: FileList): Promise<ProjectFile[]> {
  const imported: ProjectFile[] = [];

  for (const file of Array.from(fileList)) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ACCEPTED.has(ext) && ext !== "tsx") continue;

    const language = inferLanguage(file.name);
    if (!language) continue;

    const path = (file.webkitRelativePath || file.name).replace(/\\/g, "/");
    const content = await file.text();

    imported.push({
      id: path,
      name: path.split("/").pop() as string,
      path,
      language,
      category: inferCategory(path, file.name),
      content,
      originalContent: content,
    });
  }

  imported.sort((a, b) => a.path.localeCompare(b.path));
  return imported;
}

export function pickDefaultActiveFile(files: ProjectFile[]): ProjectFile | null {
  return (
    files.find((f) => f.name === "index.html") ??
    files.find((f) => f.language === "jsx") ??
    files.find((f) => f.language === "html") ??
    files[0] ??
    null
  );
}
