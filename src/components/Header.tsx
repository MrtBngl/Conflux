import { BranchIcon, MoonIcon, SparkleIcon, SunIcon } from "./icons";

interface HeaderProps {
  projectName: string;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

export function Header({ projectName, theme, onToggleTheme }: HeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900/80 px-4 backdrop-blur">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg shadow-violet-500/25">
          <SparkleIcon className="h-4 w-4 text-white" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold tracking-tight text-zinc-100">Conflux</span>
          <span className="hidden text-xs text-zinc-500 sm:inline">AI Integration Studio</span>
        </div>
        <span className="mx-1 hidden h-4 w-px bg-zinc-700 sm:block" />
        <div className="flex items-center gap-1.5 rounded-md border border-zinc-700/70 bg-zinc-800/60 px-2.5 py-1 text-xs text-zinc-300">
          <span className="font-medium text-zinc-200">{projectName}</span>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleTheme}
          className="flex items-center gap-1.5 rounded-md border border-zinc-700/70 bg-zinc-800/60 px-2.5 py-1 text-xs text-zinc-300 transition hover:border-zinc-600 hover:text-zinc-100"
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} mode`}
        >
          {theme === "dark" ? (
            <>
              <SunIcon className="h-3.5 w-3.5 text-amber-400" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <MoonIcon className="h-3.5 w-3.5 text-violet-400" />
              <span>Dark Mode</span>
            </>
          )}
        </button>

        <div className="hidden items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300 md:flex">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          AI Engine ready
        </div>

        <div className="hidden items-center gap-1.5 rounded-md border border-zinc-700/70 px-2 py-1 text-xs text-zinc-400 lg:flex">
          <BranchIcon className="h-3.5 w-3.5" />
          main
        </div>
      </div>
    </header>
  );
}

