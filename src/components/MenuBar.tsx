import { useEffect, useRef, useState } from "react";
import { cn } from "../utils/cn";

type MenuId = "file" | "edit" | "view" | "help";

export interface MenuBarActions {
  onOpenFolder: () => void;
  onUploadProject: () => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSelectAll: () => void;
  onFind: () => void;
  onResetDemo: () => void;
  onRefreshPreview: () => void;
  onToggleTheme: () => void;
  theme: "dark" | "light";
  canSave: boolean;
  canUndo: boolean;
}

interface MenuItem {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  action?: () => void;
  divider?: boolean;
}

const MENUS: { id: MenuId; label: string }[] = [
  { id: "file", label: "File" },
  { id: "edit", label: "Edit" },
  { id: "view", label: "View" },
  { id: "help", label: "Help" },
];

function buildItems(id: MenuId, actions: MenuBarActions): MenuItem[] {
  switch (id) {
    case "file":
      return [
        { label: "Open Folder…", shortcut: "Ctrl+O", action: actions.onOpenFolder },
        { label: "Upload Project (files)…", action: actions.onUploadProject },
        { divider: true, label: "" },
        { label: "Save", shortcut: "Ctrl+S", action: actions.onSave, disabled: !actions.canSave },
        { divider: true, label: "" },
        { label: "Reset to Demo Storefront", action: actions.onResetDemo },
      ];
    case "edit":
      return [
        { label: "Undo", shortcut: "Ctrl+Z", action: actions.onUndo, disabled: !actions.canUndo },
        { label: "Redo", shortcut: "Ctrl+Y", action: actions.onRedo },
        { divider: true, label: "" },
        { label: "Select All", shortcut: "Ctrl+A", action: actions.onSelectAll },
        { label: "Find in Code", shortcut: "Ctrl+F", action: actions.onFind },
      ];
    case "view":
      return [
        { label: "Refresh Live Preview", action: actions.onRefreshPreview },
        { label: actions.theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode", action: actions.onToggleTheme },
        { divider: true, label: "" },
        { label: "Reset to Demo Project", action: actions.onResetDemo },
      ];
    case "help":
      return [
        {
          label: "Conflux AI Integration Documentation",
          action: () => window.alert("Conflux DevTool: AI-powered Code Review & Live Integration Studio."),
        },
        {
          label: "Keyboard Shortcuts",
          action: () => window.alert("Shortcuts:\nCtrl+S: Save file\nCtrl+Enter: Run AI Integration Test\nCtrl+Z: Undo\nCtrl+Y: Redo\nCtrl+F: Find in Code"),
        },
        { divider: true, label: "" },
        {
          label: "About Conflux AI Integration Studio",
          action: () => window.alert("Conflux AI Integration Studio v2.0\nStatic code review, live preview bundling & Turkish code search."),
        },
      ];
    default:
      return [];
  }
}

export function MenuBar(actions: MenuBarActions) {
  const [openMenu, setOpenMenu] = useState<MenuId | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (!barRef.current?.contains(e.target as Node)) setOpenMenu(null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div
      ref={barRef}
      className="flex h-8 shrink-0 items-stretch border-b border-zinc-800 bg-zinc-950/90 px-1 text-xs select-none"
    >
      {MENUS.map((menu) => {
        const isOpen = openMenu === menu.id;
        const items = buildItems(menu.id, actions);
        return (
          <div key={menu.id} className="relative">
            <button
              type="button"
              onClick={() => setOpenMenu((prev) => (prev === menu.id ? null : menu.id))}
              onMouseEnter={() => {
                if (openMenu) setOpenMenu(menu.id);
              }}
              className={cn(
                "rounded px-2.5 py-1.5 text-zinc-300 transition",
                isOpen ? "bg-zinc-800 text-zinc-100" : "hover:bg-zinc-800/70 hover:text-zinc-100"
              )}
            >
              {menu.label}
            </button>
            {isOpen && (
              <div className="absolute left-0 top-full z-50 mt-0.5 min-w-[220px] rounded-md border border-zinc-700 bg-zinc-900 py-1 shadow-xl ring-1 ring-black/40">
                {items.map((item, i) =>
                  item.divider ? (
                    <div key={`d-${i}`} className="my-1 border-t border-zinc-800" />
                  ) : (
                    <button
                      key={item.label}
                      type="button"
                      disabled={item.disabled}
                      onClick={() => {
                        if (!item.disabled && item.action) item.action();
                        setOpenMenu(null);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-6 px-3 py-1.5 text-left text-zinc-300 transition",
                        item.disabled
                          ? "cursor-not-allowed text-zinc-600"
                          : "hover:bg-violet-500/15 hover:text-zinc-100"
                      )}
                    >
                      <span>{item.label}</span>
                      {item.shortcut && (
                        <span className="font-mono text-[10px] text-zinc-500">{item.shortcut}</span>
                      )}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
