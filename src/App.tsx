import { useEffect, useRef, useState } from "react";
import { DEFAULT_ACTIVE_PATH, PROJECT_FILES, PROJECT_NAME, buildPreviewSrcDoc } from "./data/files";
import { ANALYSIS_STEPS, analyzeIntegration, type Finding, type AnalysisResult } from "./lib/analyze";
import { Group, Panel } from "react-resizable-panels";
import { CodeEditor, type CodeEditorHandle } from "./components/CodeEditor";
import { FileExplorer } from "./components/FileExplorer";
import { Header } from "./components/Header";
import { MenuBar } from "./components/MenuBar";
import { PanelResizeHandle } from "./components/PanelResizeHandle";
import { ProjectImportInputs, type ProjectImportHandle } from "./components/ProjectImportInputs";
import { RightPanel, type AnalysisState } from "./components/RightPanel";
import { StatusBar } from "./components/StatusBar";
import { cn } from "./utils/cn";
import { processUploadedFiles } from "./utils/fileImport";
import type { Category, ProjectFile, Toast } from "./types";
import { AlertIcon, CheckIcon, InfoIcon, XIcon } from "./components/icons";

export default function App() {
  /* ---------------- State ---------------- */
  const [files, setFiles] = useState<ProjectFile[]>(PROJECT_FILES);
  const [tabs, setTabs] = useState<string[]>([DEFAULT_ACTIVE_PATH]);
  const [activeId, setActiveId] = useState<string | null>(DEFAULT_ACTIVE_PATH);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [previewSrc, setPreviewSrc] = useState<string>(() => buildPreviewSrcDoc(PROJECT_FILES));
  const [projectName, setProjectName] = useState<string>(PROJECT_NAME);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("conflux-theme") as "dark" | "light") || "dark";
  });
  const [analysis, setAnalysis] = useState<AnalysisState>({
    analyzing: false,
    stepIndex: 0,
    result: null,
    hasRun: false,
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [cursor, setCursor] = useState({ ln: 1, col: 1 });

  /* ---------------- Refs (avoid stale closures) ---------------- */
  const filesRef = useRef(files);
  const activeIdRef = useRef(activeId);
  const analyzingRef = useRef(false);
  const runIdRef = useRef(0);
  const toastIdRef = useRef(0);
  const importRef = useRef<ProjectImportHandle>(null);
  const editorHandleRef = useRef<CodeEditorHandle>(null);

  useEffect(() => { filesRef.current = files; }, [files]); 
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem("conflux-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  };

  /* ---------------- Toasts ---------------- */
  const toast = (message: string, type: Toast["type"] = "info") => {
    const id = ++toastIdRef.current;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  };

  /* ---------------- File / tab handlers ---------------- */
  const openFile = (id: string) => {
    setTabs((t) => (t.includes(id) ? t : [...t, id]));
    setActiveId(id);
  };

  const openFileAtLine = (id: string, line: number) => {
    openFile(id);
    setTimeout(() => {
      editorHandleRef.current?.jumpToLine(line);
    }, 150);
  };

  const closeTab = (id: string) => {
    setTabs((t) => {
      const next = t.filter((x) => x !== id);
      if (activeId === id) {
        const idx = t.indexOf(id);
        setActiveId(next[idx] ?? next[idx - 1] ?? null);
      }
      return next;
    });
  };

  const updateContent = (id: string, content: string) => {
    setFiles((fs) => fs.map((f) => (f.id === id ? { ...f, content } : f)));
  };

  const saveActive = () => {
    const id = activeIdRef.current;
    if (!id) return;
    const f = filesRef.current.find((x) => x.id === id);
    if (!f || f.content === f.originalContent) return;
    setFiles((fs) => fs.map((x) => (x.id === id ? { ...x, originalContent: x.content } : x)));
    toast(`Saved ${f.name}`, "success");
  };

  const revertActive = () => {
    const id = activeIdRef.current;
    if (!id) return;
    const f = filesRef.current.find((x) => x.id === id);
    if (!f || f.content === f.originalContent) return;
    setFiles((fs) => fs.map((x) => (x.id === id ? { ...x, content: x.originalContent } : x)));
    toast(`Reverted ${f.name}`, "info");
  };

  const refreshPreview = () => {
    setPreviewSrc(buildPreviewSrcDoc(filesRef.current));
    toast("Preview refreshed", "info");
  };

  /* ---------------- File import handlers ---------------- */
  const handleFilesSelected = async (fileList: FileList) => {
    try {
      const imported = await processUploadedFiles(fileList);
      if (imported.length === 0) {
        toast("No supported files found (HTML, JS, JSX, CSS, SQL)", "error");
        return;
      }
      
      const firstRel = (fileList[0] as unknown as { webkitRelativePath?: string })?.webkitRelativePath;
      if (firstRel && firstRel.includes("/")) {
        setProjectName(firstRel.split("/")[0]);
      } else if (fileList[0]?.name) {
        setProjectName(fileList[0].name.split(".")[0]);
      } else {
        setProjectName("uploaded-project");
      }

      setFiles(imported);
      filesRef.current = imported;
      setTabs([imported[0].id]);
      setActiveId(imported[0].id);
      setCollapsed({});
      setActiveCategory(null);
      setSearch("");
      setPreviewSrc(buildPreviewSrcDoc(imported));
      setAnalysis({ analyzing: false, stepIndex: 0, result: null, hasRun: false });
      toast(`Imported ${imported.length} file(s)`, "success");
    } catch {
      toast("Failed to read files", "error");
    }
  };

  const resetToDemo = () => {
    setFiles(PROJECT_FILES);
    filesRef.current = PROJECT_FILES;
    setProjectName(PROJECT_NAME);
    setTabs([DEFAULT_ACTIVE_PATH]);
    setActiveId(DEFAULT_ACTIVE_PATH);
    setCollapsed({});
    setActiveCategory(null);
    setSearch("");
    setPreviewSrc(buildPreviewSrcDoc(PROJECT_FILES));
    setAnalysis({ analyzing: false, stepIndex: 0, result: null, hasRun: false });
    toast("Reset to Demo Storefront", "info");
  };

  /* ---------------- AI integration run ---------------- */
  const performAnalysis = async (filesSnapshot: ProjectFile[], fileId: string) => {
    if (analyzingRef.current) return;
    const file = filesSnapshot.find((f) => f.id === fileId || f.path === fileId);
    if (!file) return;
    const runId = ++runIdRef.current;
    analyzingRef.current = true;

    // Refresh the live preview from the current file contents.
    setPreviewSrc(buildPreviewSrcDoc(filesSnapshot));
    setAnalysis((s) => ({ ...s, analyzing: true, stepIndex: 0 }));

    // Extract exact active file content and properties
    const code = file.content;
    const filePath = file.path;
    const category = file.category;

    console.log("Frontend payload being sent:", {
      code,
      filePath,
      category,
      codeLength: code?.length,
    });

    const steps = ANALYSIS_STEPS;
    let idx = 0;
    const tickInterval = setInterval(() => {
      if (runIdRef.current !== runId) {
        clearInterval(tickInterval);
        return;
      }
      idx = Math.min(idx + 1, steps.length - 1);
      setAnalysis((s) => ({ ...s, stepIndex: idx }));
    }, 240);

    const t0 = performance.now();
    const previewHtml = filesSnapshot.find((x) => x.name === "index.html")?.content ?? "";
    let result: AnalysisResult = analyzeIntegration({
      file,
      original: file.originalContent,
      current: file.content,
      files: filesSnapshot,
      previewHtml,
    });

    try {
      const response = await fetch("/api/analyze-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          filePath,
          category,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log("Frontend received AI analysis response:", data);

      const isCompatible = data.status === "COMPATIBLE";
      const findings: Finding[] = (data.findings || []).map((f: any, i: number) => ({
        id: `ai-finding-${i}`,
        severity: f.severity === "BREAKING" ? "critical" : f.severity === "WARNING" ? "warning" : "info",
        title: f.title || "AI Finding",
        detail: f.description || f.detail || "",
        fix: f.quick_fix || f.fix || "Önerilen düzeltmeyi uygulayın.",
      }));

      result = {
        status: isCompatible ? "compatible" : "conflict",
        summary: data.summary || (isCompatible ? "Entegrasyon testi başarılı." : "Çakışma tespit edildi."),
        findings,
        checksRun: ["Gemini AI Code Review", "Syntax & Parsing Check", "Integration Contracts"],
        durationMs: Math.round(performance.now() - t0),
        fileName: file.name,
      };
    } catch (err) {
      console.warn("Backend analysis fetch failed, falling back to local analyzer:", err);
      const previewHtml = filesSnapshot.find((x) => x.name === "index.html")?.content ?? "";
      result = analyzeIntegration({
        file,
        original: file.originalContent,
        current: file.content,
        files: filesSnapshot,
        previewHtml,
      });
    } finally {
      clearInterval(tickInterval);
      if (runIdRef.current === runId) {
        analyzingRef.current = false;
        setAnalysis({ analyzing: false, stepIndex: steps.length, result, hasRun: true });
        toast(
          result.status === "compatible"
            ? "Integration check passed — COMPATIBLE"
            : "Conflict detected — review findings",
          result.status === "compatible" ? "success" : "error"
        );
      }
    }
  };

  const runIntegration = () => {
    if (analyzingRef.current) return;
    const id = activeIdRef.current;
    if (!id) {
      toast("Open a file first", "error");
      return;
    }
    performAnalysis(filesRef.current, id);
  };

  const applyFix = (finding: Finding) => {
    if (!finding.applyFix) return;
    const id = activeIdRef.current;
    if (!id) return;
    const apply = finding.applyFix;
    const newFiles = filesRef.current.map((f) =>
      f.id === id ? { ...f, content: apply(f.content) } : f
    );
    setFiles(newFiles);
    filesRef.current = newFiles;
    toast("Quick fix applied", "success");
    performAnalysis(newFiles, id);
  };

  /* ---------------- Keyboard shortcuts ---------------- */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveActive();
      } else if (mod && e.key === "Enter") {
        e.preventDefault();
        runIntegration();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  /* ---------------- Derived ---------------- */
  const activeFile = files.find((f) => f.id === activeId) ?? null;
  const result = analysis.result;
  const errors = result && !analysis.analyzing ? result.findings.filter((f) => f.severity === "critical").length : 0;
  const warnings = result && !analysis.analyzing ? result.findings.filter((f) => f.severity === "warning").length : 0;

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-zinc-950 text-zinc-200">
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-emerald-600/5 blur-3xl" />
      </div>

      <Header projectName={projectName} theme={theme} onToggleTheme={toggleTheme} />

      <MenuBar
        onOpenFolder={() => importRef.current?.openFolder()}
        onUploadProject={() => importRef.current?.openFiles()}
        onSave={saveActive}
        onUndo={() => editorHandleRef.current?.undo()}
        onRedo={() => editorHandleRef.current?.redo()}
        onSelectAll={() => editorHandleRef.current?.selectAll()}
        onFind={() => editorHandleRef.current?.find()}
        onResetDemo={resetToDemo}
        onRefreshPreview={refreshPreview}
        onToggleTheme={toggleTheme}
        theme={theme}
        canSave={!!(activeFile && activeFile.content !== activeFile.originalContent)}
        canUndo={!!(activeFile && activeFile.content !== activeFile.originalContent)}
      />

      {/* Hidden file inputs for folder / file import */}
      <ProjectImportInputs ref={importRef} onFilesSelected={handleFilesSelected} />

      <Group orientation="horizontal" className="min-h-0 flex-1">
        <Panel defaultSize="20%" minSize="12%" maxSize="45%">
          <aside className="h-full">
            <FileExplorer
              files={files}
              activeId={activeId}
              search={search}
              onSearch={setSearch}
              activeCategory={activeCategory}
              onToggleCategory={(c) => setActiveCategory((p) => (p === c ? null : c))}
              onOpen={openFile}
              onOpenAtLine={openFileAtLine}
              collapsed={collapsed}
              onToggleFolder={(p) => setCollapsed((prev) => ({ ...prev, [p]: !prev[p] }))}
              onImportFiles={() => importRef.current?.openFiles()}
            />
          </aside>
        </Panel>

        <PanelResizeHandle direction="horizontal" />

        <Panel defaultSize="45%" minSize="20%">
          <main className="h-full">
            <CodeEditor
              files={files}
              tabs={tabs}
              activeId={activeId}
              onOpen={openFile}
              onClose={closeTab}
              onChange={updateContent}
              onSave={saveActive}
              onRevert={revertActive}
              onRun={runIntegration}
              onCursorChange={(ln, col) => setCursor({ ln, col })}
              running={analysis.analyzing}
              theme={theme}
              editorRef={editorHandleRef}
            />
          </main>
        </Panel>

        <PanelResizeHandle direction="horizontal" />

        <Panel defaultSize="35%" minSize="20%">
          <section className="h-full">
            <RightPanel
              previewSrc={previewSrc}
              onRefreshPreview={refreshPreview}
              analysis={analysis}
              onApplyFix={applyFix}
            />
          </section>
        </Panel>
      </Group>


      <StatusBar
        cursor={cursor}
        language={activeFile?.language ?? null}
        errors={errors}
        warnings={warnings}
        aiReady={!analysis.analyzing}
      />

      {/* Toasts */}
      <div className="pointer-events-none fixed right-4 top-14 z-50 flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs shadow-xl ring-1 backdrop-blur",
              t.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200 ring-emerald-500/30"
                : t.type === "error"
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-200 ring-rose-500/30"
                  : "border-zinc-700 bg-zinc-900/90 text-zinc-200 ring-zinc-700"
            )}
          >
            {t.type === "success" ? (
              <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
            ) : t.type === "error" ? (
              <AlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
            ) : (
              <InfoIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
            )}
            <span className="flex-1 leading-relaxed">{t.message}</span>
            <button
              onClick={() => setToasts((ts) => ts.filter((x) => x.id !== t.id))}
              className="text-zinc-500 transition hover:text-zinc-200"
            >
              <XIcon className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
