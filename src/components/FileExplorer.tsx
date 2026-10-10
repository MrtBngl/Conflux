import { useState, useMemo, type ReactNode } from "react";
import { CATEGORY_META, CATEGORY_ORDER } from "../data/files";
import type { Category, ProjectFile } from "../types";
import { cn } from "../utils/cn";
import { ChevronDown, ChevronRight, FileIcon, FolderIcon, SearchIcon, UploadIcon } from "./icons";

interface Props {
  files: ProjectFile[];
  activeId: string | null;
  search: string;
  onSearch: (v: string) => void;
  activeCategory: Category | null;
  onToggleCategory: (c: Category) => void;
  onOpen: (id: string) => void;
  onOpenAtLine?: (id: string, line: number) => void;
  collapsed: Record<string, boolean>;
  onToggleFolder: (path: string) => void;
  onImportFiles: () => void;
}

/* ---------------- Turkish Semantic Search ---------------- */

interface CodeSearchResult {
  file: ProjectFile;
  line: number;
  lineText: string;
  matchScore: number;
}

const TURKISH_SYNONYMS: Record<string, string[]> = {
  kart: ["kart", "card", "cards", "tile", "item"],
  eslestirme: ["match", "flip", "pair", "compare", "esles", "checkmatch", "eslestir", "selectcard", "turn"],
  esles: ["match", "flip", "pair", "compare", "esles", "checkmatch", "eslestir"],
  eslestir: ["match", "flip", "pair", "compare", "esles", "checkmatch", "eslestir"],
  fonksiyon: ["function", "const", "let", "var", "def", "fn", "method"],
  fonksiyonu: ["function", "const", "let", "var", "def", "fn", "method"],
  oyun: ["game", "board", "grid", "play", "deck", "score"],
  puan: ["score", "point", "points", "count"],
  sayac: ["timer", "clock", "time", "count"],
  odeme: ["pay", "payment", "charge", "checkout", "card"],
  giris: ["auth", "login", "user", "session"],
  sepet: ["cart", "items", "item", "total"],
  veritabani: ["db", "database", "query", "sql", "table"],
};

function trNormalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/i̇/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u");
}

function searchCodeContents(files: ProjectFile[], query: string): CodeSearchResult[] {
  const normQuery = trNormalize(query.trim());
  if (!normQuery) return [];

  const rawWords = normQuery.split(/\s+/).filter(Boolean);
  const searchTerms = Array.from(
    new Set(
      rawWords.flatMap((w) => {
        const synonyms = TURKISH_SYNONYMS[w] || [];
        return [w, ...synonyms];
      })
    )
  );

  const results: CodeSearchResult[] = [];

  for (const file of files) {
    const lines = file.content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const lineRaw = lines[i];
      const lineNorm = trNormalize(lineRaw);

      let hits = 0;
      for (const term of searchTerms) {
        if (lineNorm.includes(term)) {
          hits += 1;
        }
      }

      if (hits > 0) {
        results.push({
          file,
          line: i + 1,
          lineText: lineRaw.trim(),
          matchScore: hits,
        });
      }
    }
  }

  return results.sort((a, b) => b.matchScore - a.matchScore).slice(0, 50);
}

/* ---------------- Tree model ---------------- */

interface TreeNode {
  name: string;
  path: string;
  type: "folder" | "file";
  children: TreeNode[];
  file?: ProjectFile;
}

function buildTree(files: ProjectFile[]): TreeNode[] {
  const roots: TreeNode[] = [];
  const folderMap = new Map<string, TreeNode>();

  const getFolder = (segments: string[]): TreeNode => {
    let parentChildren = roots;
    let parentPath = "";
    let node: TreeNode | undefined;
    for (const seg of segments) {
      parentPath = parentPath ? parentPath + "/" + seg : seg;
      node = folderMap.get(parentPath);
      if (!node) {
        node = { name: seg, path: parentPath, type: "folder", children: [] };
        folderMap.set(parentPath, node);
        parentChildren.push(node);
      }
      parentChildren = node.children;
    }
    return node as TreeNode;
  };

  for (const f of files) {
    const segs = f.path.split("/");
    const folderSegs = segs.slice(0, -1);
    const parent = folderSegs.length ? getFolder(folderSegs) : null;
    const node: TreeNode = {
      name: f.name,
      path: f.path,
      type: "file",
      children: [],
      file: f,
    };
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const n of nodes) if (n.type === "folder") sort(n.children);
  };
  sort(roots);
  return roots;
}

function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-sm bg-violet-500/30 text-violet-200">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

/* ---------------- Component ---------------- */

export function FileExplorer({
  files,
  activeId,
  search,
  onSearch,
  activeCategory,
  onToggleCategory,
  onOpen,
  onOpenAtLine,
  collapsed,
  onToggleFolder,
  onImportFiles,
}: Props) {
  const [tab, setTab] = useState<"explorer" | "search">("explorer");

  const modifiedIds = useMemo(
    () => new Set(files.filter((f) => f.content !== f.originalContent).map((f) => f.id)),
    [files]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return files.filter((f) => {
      const matchQ = !q || f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q);
      const matchC = !activeCategory || f.category === activeCategory;
      return matchQ && matchC;
    });
  }, [files, search, activeCategory]);

  const codeSearchResults = useMemo(() => {
    if (!search.trim()) return [];
    return searchCodeContents(files, search);
  }, [files, search]);

  const isFiltering = search.trim().length > 0 || activeCategory !== null;

  const tree = useMemo(
    () => buildTree(isFiltering ? filtered : files),
    [files, filtered, isFiltering]
  );

  const renderNode = (node: TreeNode, depth: number): ReactNode => {
    if (node.type === "folder") {
      const isOpen = !collapsed[node.path];
      return (
        <div key={node.path}>
          <button
            onClick={() => onToggleFolder(node.path)}
            className="flex w-full items-center gap-1 rounded px-1.5 py-1 text-left text-xs text-zinc-400 transition hover:bg-zinc-800/70 hover:text-zinc-200"
            style={{ paddingLeft: 6 + depth * 12 }}
          >
            {isOpen ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
            )}
            <FolderIcon className="h-3.5 w-3.5 shrink-0 text-sky-400/80" open={isOpen} />
            <span className="truncate font-medium">{node.name}</span>
            <span className="ml-auto text-[10px] text-zinc-600">{node.children.length}</span>
          </button>
          {isOpen && node.children.map((c) => renderNode(c, depth + 1))}
        </div>
      );
    }
    const f = node.file as ProjectFile;
    const meta = CATEGORY_META[f.category];
    const isActive = f.id === activeId;
    const isModified = modifiedIds.has(f.id);
    return (
      <button
        key={f.id}
        onClick={() => onOpen(f.id)}
        className={cn(
          "group flex w-full items-center gap-1.5 rounded pr-1.5 py-1 text-left text-xs transition",
          isActive
            ? "bg-violet-500/15 text-zinc-100 ring-1 ring-inset ring-violet-500/30"
            : "text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200"
        )}
        style={{ paddingLeft: 22 + depth * 12 }}
        title={f.path}
      >
        <FileIcon language={f.language} />
        <span className="truncate">{highlightMatch(f.name, search.trim())}</span>
        {isModified ? (
          <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
        ) : (
          <span className={cn("ml-auto h-1.5 w-1.5 shrink-0 rounded-full", meta.dot)} />
        )}
      </button>
    );
  };

  return (
    <div className="flex h-full w-full flex-col bg-zinc-900">
      {/* Tab Switcher: Explorer vs Search */}
      <div className="flex border-b border-zinc-800 bg-zinc-950/40 text-xs">
        <button
          type="button"
          onClick={() => setTab("explorer")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 py-2 font-medium transition",
            tab === "explorer"
              ? "border-b-2 border-violet-500 bg-zinc-900 text-zinc-100"
              : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <span>📁</span>
          <span>Explorer</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("search")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 py-2 font-medium transition",
            tab === "search"
              ? "border-b-2 border-violet-500 bg-zinc-900 text-zinc-100"
              : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <SearchIcon className="h-3.5 w-3.5" />
          <span>Kodda Ara (TR)</span>
        </button>
      </div>

      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 px-3 pt-2.5 pb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          {tab === "explorer" ? "Explorer" : "Kod Arama (Türkçe Destekli)"}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-600">{files.length} files</span>
          <button
            type="button"
            onClick={onImportFiles}
            className="flex items-center gap-1 rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-[10px] font-medium text-violet-200 transition hover:border-violet-400/50 hover:bg-violet-500/20"
            title="Import project files"
          >
            <UploadIcon className="h-3 w-3" />
            Import
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="px-2 pb-2">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={
              tab === "search"
                ? "Örn: kart eşleştirme fonksiyonu..."
                : "Dosya veya içerik ara..."
            }
            className="w-full rounded-md border border-zinc-700/70 bg-zinc-950/60 py-1.5 pl-8 pr-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-violet-500/60 focus:outline-none focus:ring-1 focus:ring-violet-500/40"
          />
        </div>
      </div>

      {/* Mode View */}
      {tab === "search" ? (
        /* Turkish Code Search Results View */
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4 space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 px-1 pt-1">
            Arama Sonuçları ({codeSearchResults.length})
          </div>
          {codeSearchResults.length === 0 ? (
            <div className="px-2 py-8 text-center text-xs text-zinc-500">
              {search.trim()
                ? "Aramanıza uygun kod parçası veya fonksiyon bulunamadı."
                : "Aramak istediğiniz Türkçe terimi girin (örn: 'kart eşleştirme fonksiyonu')."}
            </div>
          ) : (
            codeSearchResults.map((res, i) => (
              <button
                key={`${res.file.id}-${res.line}-${i}`}
                type="button"
                onClick={() => {
                  if (onOpenAtLine) onOpenAtLine(res.file.id, res.line);
                  else onOpen(res.file.id);
                }}
                className="w-full text-left rounded-lg border border-zinc-800 bg-zinc-950/80 p-2 text-xs transition hover:border-violet-500/40 hover:bg-zinc-800/60 group"
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-semibold text-zinc-200 truncate group-hover:text-violet-300">
                    {res.file.name}
                  </span>
                  <span className="font-mono text-[10px] text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">
                    L{res.line}
                  </span>
                </div>
                <div className="text-[10px] text-zinc-500 truncate mb-1">{res.file.path}</div>
                <div className="font-mono text-[11px] text-zinc-300 bg-zinc-900 p-1.5 rounded border border-zinc-800/80 truncate">
                  {res.lineText}
                </div>
              </button>
            ))
          )}
        </div>
      ) : (
        /* Standard File Explorer View */
        <>
          {/* Category tags */}
          <div className="flex flex-wrap gap-1.5 px-2 pb-3">
            {CATEGORY_ORDER.map((c) => {
              const meta = CATEGORY_META[c];
              const active = activeCategory === c;
              return (
                <button
                  key={c}
                  onClick={() => onToggleCategory(c)}
                  className={cn(
                    "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition",
                    active
                      ? cn("border-transparent ring-1", meta.bg, meta.text, meta.ring)
                      : "border-zinc-700/70 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                  #{c}
                </button>
              );
            })}
          </div>

          {/* Tree */}
          <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-4">
            {filtered.length === 0 ? (
              <div className="px-2 py-6 text-center text-xs text-zinc-600">No files match your filters.</div>
            ) : search.trim() ? (
              <div className="space-y-0.5">
                {filtered.map((f) => {
                  const meta = CATEGORY_META[f.category];
                  const isActive = f.id === activeId;
                  const isModified = modifiedIds.has(f.id);
                  return (
                    <button
                      key={f.id}
                      onClick={() => onOpen(f.id)}
                      className={cn(
                        "flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-xs transition",
                        isActive
                          ? "bg-violet-500/15 text-zinc-100 ring-1 ring-inset ring-violet-500/30"
                          : "text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200"
                      )}
                    >
                      <FileIcon language={f.language} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate">{highlightMatch(f.name, search.trim())}</div>
                        <div className="truncate text-[10px] text-zinc-600">{f.path}</div>
                      </div>
                      {isModified ? (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                      ) : (
                        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", meta.dot)} />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-0.5">{tree.map((n) => renderNode(n, 0))}</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

