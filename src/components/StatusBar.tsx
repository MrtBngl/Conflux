import type { Language } from "../types";
import { cn } from "../utils/cn";
import { AlertIcon, BranchIcon, CheckIcon, SparkleIcon } from "./icons";

interface Props {
  cursor: { ln: number; col: number };
  language: Language | null;
  errors: number;
  warnings: number;
  aiReady: boolean;
}

export function StatusBar({ cursor, language, errors, warnings, aiReady }: Props) {
  return (
    <footer className="flex h-6 shrink-0 items-center justify-between border-t border-zinc-800 bg-zinc-950 px-3 text-[10px] text-zinc-500">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1 text-zinc-400">
          <BranchIcon className="h-3 w-3" />
          main
        </span>
        <span className="flex items-center gap-1">
          <AlertIcon className={cn("h-3 w-3", errors ? "text-rose-400" : "text-zinc-600")} />
          {errors}
        </span>
        <span className="flex items-center gap-1">
          <AlertIcon className={cn("h-3 w-3", warnings ? "text-amber-400" : "text-zinc-600")} />
          {warnings}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden sm:inline">Conflux · AI Code Review</span>
        <span className="font-mono">
          Ln {cursor.ln}, Col {cursor.col}
        </span>
        <span className="rounded bg-zinc-800 px-1.5 py-px font-mono uppercase">{language ?? "—"}</span>
        <span className="rounded bg-zinc-800 px-1.5 py-px font-mono">UTF-8</span>
        <span
          className={cn(
            "flex items-center gap-1 rounded px-1.5 py-px",
            aiReady ? "bg-emerald-500/10 text-emerald-300" : "bg-zinc-800 text-zinc-500"
          )}
        >
          {aiReady ? <CheckIcon className="h-3 w-3" /> : <SparkleIcon className="h-3 w-3" />}
          {aiReady ? "AI Ready" : "AI Busy"}
        </span>
      </div>
    </footer>
  );
}
