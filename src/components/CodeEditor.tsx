import { useEffect, useRef, useState } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { LANGUAGE_META } from "../data/files";
import type { Language, ProjectFile } from "../types";
import { cn } from "../utils/cn";
import {
  FileIcon,
  PlayIcon,
  SaveIcon,
  SparkleIcon,
  UndoIcon,
  XIcon,
} from "./icons";

export interface CodeEditorHandle {
  undo: () => void;
  redo: () => void;
  selectAll: () => void;
  find: () => void;
  jumpToLine: (line: number) => void;
}

interface Props {
  files: ProjectFile[];
  tabs: string[];
  activeId: string | null;
  onOpen: (id: string) => void;
  onClose: (id: string) => void;
  onChange: (id: string, content: string) => void;
  onSave: () => void;
  onRevert: () => void;
  onRun: () => void;
  onCursorChange: (ln: number, col: number) => void;
  running: boolean;
  theme?: "dark" | "light";
  editorRef?: React.Ref<CodeEditorHandle>;
}

const MONACO_LANGUAGE: Record<Language, string> = {
  jsx: "javascript",
  js: "javascript",
  ts: "typescript",
  css: "css",
  html: "html",
  sql: "sql",
};

function MonacoEditorArea({
  file,
  content,
  onChange,
  onCursorChange,
  theme = "dark",
  editorHandleRef,
}: {
  file: ProjectFile;
  content: string;
  onChange: (v: string) => void;
  onCursorChange: (ln: number, col: number) => void;
  theme?: "dark" | "light";
  editorHandleRef?: React.Ref<CodeEditorHandle>;
}) {
  const edRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    const handle: CodeEditorHandle = {
      undo: () => edRef.current?.trigger("menu", "undo", null),
      redo: () => edRef.current?.trigger("menu", "redo", null),
      selectAll: () => edRef.current?.trigger("keyboard", "selectAll", null),
      find: () => edRef.current?.trigger("keyboard", "actions.find", null),
      jumpToLine: (ln: number) => {
        if (!edRef.current) return;
        edRef.current.revealLineInCenter(ln);
        edRef.current.setPosition({ lineNumber: ln, column: 1 });
        edRef.current.focus();
      },
    };
    if (typeof editorHandleRef === "function") {
      editorHandleRef(handle);
    } else if (editorHandleRef) {
      (editorHandleRef as React.MutableRefObject<CodeEditorHandle | null>).current = handle;
    }
  });

  const handleMount: OnMount = (ed, monaco) => {
    edRef.current = ed;

    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      jsx: monaco.languages.typescript.JsxEmit.React,
      allowNonTsExtensions: true,
      target: monaco.languages.typescript.ScriptTarget.ES2020,
    });

    ed.onDidChangeCursorPosition((e) => {
      onCursorChange(e.position.lineNumber, e.position.column);
    });
  };

  return (
    <div className="monaco-shell min-h-0 flex-1 overflow-hidden bg-zinc-950">
      <Editor
        key={file.id}
        height="100%"
        language={MONACO_LANGUAGE[file.language]}
        value={content}
        theme={theme === "dark" ? "vs-dark" : "vs"}
        onMount={handleMount}
        onChange={(value) => onChange(value ?? "")}
        options={{
          fontFamily: "JetBrains Mono, ui-monospace, SF Mono, Menlo, Consolas, monospace",
          fontSize: 13,
          lineHeight: 20,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: "off",
          tabSize: 2,
          automaticLayout: true,
          suggestOnTriggerCharacters: true,
          quickSuggestions: { other: true, comments: false, strings: true },
          wordBasedSuggestions: "matchingDocuments",
          parameterHints: { enabled: true },
          lineNumbers: "on",
          lineNumbersMinChars: 4,
          renderLineHighlight: "all",
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          padding: { top: 14, bottom: 14 },
          bracketPairColorization: { enabled: true },
          formatOnPaste: true,
          formatOnType: true,
          scrollbar: {
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
          suggest: {
            preview: true,
            showIcons: true,
            showMethods: true,
            showFunctions: true,
            showKeywords: true,
            showSnippets: true,
          },
        }}
      />
    </div>
  );
}

export function CodeEditor({
  files,
  tabs,
  activeId,
  onOpen,
  onClose,
  onChange,
  onSave,
  onRevert,
  onRun,
  onCursorChange,
  running,
  theme = "dark",
  editorRef,
}: Props) {
  const activeFile = files.find((f) => f.id === activeId) ?? null;
  const [cursor, setCursor] = useState({ ln: 1, col: 1 });

  const handleCursor = (ln: number, col: number) => {
    setCursor({ ln, col });
    onCursorChange(ln, col);
  };

  const modified = activeFile ? activeFile.content !== activeFile.originalContent : false;

  const breadcrumb = activeFile ? activeFile.path.split("/") : [];

  return (
    <div className="flex h-full w-full flex-col bg-zinc-900">
      {/* Tab bar */}
      <div className="flex h-9 shrink-0 items-stretch overflow-x-auto border-b border-zinc-800 bg-zinc-900/60">
        {tabs.length === 0 && (
          <div className="flex items-center px-4 text-xs text-zinc-600">No file open</div>
        )}
        {tabs.map((id) => {
          const f = files.find((x) => x.id === id);
          if (!f) return null;
          const isActive = id === activeId;
          const isModified = f.content !== f.originalContent;
          return (
            <div
              key={id}
              onClick={() => onOpen(id)}
              className={cn(
                "group flex shrink-0 cursor-pointer items-center gap-2 border-r border-zinc-800 px-3 text-xs transition",
                isActive
                  ? "bg-zinc-950 text-zinc-50 shadow-[inset_0_3px_0_0_#a78bfa] ring-1 ring-inset ring-violet-500/25"
                  : "text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300"
              )}
            >
              <FileIcon language={f.language} />
              <span className="max-w-[160px] truncate font-medium">{f.name}</span>
              {isModified && (
                <span className="shrink-0 text-[10px] font-semibold text-amber-400">●</span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(id);
                }}
                className="ml-0.5 rounded p-0.5 text-zinc-600 opacity-0 transition hover:bg-zinc-700 hover:text-zinc-200 group-hover:opacity-100"
                title="Close tab"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Breadcrumb */}
      <div className="flex h-7 shrink-0 items-center gap-1.5 border-b border-zinc-800/70 bg-zinc-900/40 px-4 text-[11px] text-zinc-500">
        {breadcrumb.map((seg, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-zinc-700">/</span>}
            <span className={i === breadcrumb.length - 1 ? "text-zinc-300" : ""}>{seg}</span>
          </span>
        ))}
        {activeFile && (
          <span className="ml-auto rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] uppercase text-zinc-400">
            {LANGUAGE_META[activeFile.language].label}
          </span>
        )}
      </div>

      {/* Editor */}
      {activeFile ? (
        <MonacoEditorArea
          file={activeFile}
          content={activeFile.content}
          onChange={(v) => onChange(activeFile.id, v)}
          onCursorChange={handleCursor}
          theme={theme}
          editorHandleRef={editorRef}
        />
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-zinc-600">
          Select a file from the explorer to start editing.
        </div>
      )}

      {/* Action bar */}
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-t border-zinc-800 bg-zinc-900/80 px-3">
        <div className="flex min-w-0 items-center gap-3 text-[11px] text-zinc-500">
          {activeFile && (
            <>
              <span className="font-mono text-zinc-400">
                Ln {cursor.ln}, Col {cursor.col}
              </span>
              <span
                className={cn(
                  "flex items-center gap-1 rounded-full px-2 py-0.5",
                  modified ? "bg-amber-500/10 text-amber-300" : "bg-emerald-500/10 text-emerald-300"
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    modified ? "bg-amber-400" : "bg-emerald-400"
                  )}
                />
                {modified ? "Unsaved changes" : "Saved"}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRevert}
            disabled={!activeFile || !modified || running}
            className="flex items-center gap-1.5 rounded-md border border-zinc-700/70 px-2.5 py-1.5 text-xs text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
            title="Revert to saved version"
          >
            <UndoIcon className="h-3.5 w-3.5" />
            Revert
          </button>
          <button
            onClick={onSave}
            disabled={!activeFile || !modified || running}
            className="flex items-center gap-1.5 rounded-md border border-zinc-700/70 px-2.5 py-1.5 text-xs text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
            title="Save (Ctrl/Cmd+S)"
          >
            <SaveIcon className="h-3.5 w-3.5" />
            Save
          </button>

          <button
            onClick={onRun}
            disabled={!activeFile || running}
            className="group relative flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/30 transition hover:from-emerald-400 hover:to-emerald-500 hover:shadow-emerald-400/40 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:from-emerald-500 disabled:hover:to-emerald-600"
            title="Run AI integration test & refresh live preview (Ctrl/Cmd+Enter)"
          >
            {running ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-900/40 border-t-zinc-900" />
            ) : (
              <PlayIcon className="h-4 w-4" />
            )}
            <span>{running ? "Analyzing…" : "Run / Test Integration"}</span>
            <span className="flex items-center gap-0.5 rounded bg-black/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
              <SparkleIcon className="h-2.5 w-2.5" />
              AI
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
