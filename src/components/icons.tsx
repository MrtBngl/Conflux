import type { ReactNode } from "react";
import { LANGUAGE_META } from "../data/files";
import type { Language } from "../types";

/* ---------------- File type badge ---------------- */

export function FileIcon({ language, className = "" }: { language: Language; className?: string }) {
  const meta = LANGUAGE_META[language];
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded border px-1 font-mono font-semibold ${meta.cls} ${className}`}
      style={{ fontSize: "8.5px", lineHeight: "14px", letterSpacing: "0.02em" }}
    >
      {meta.label}
    </span>
  );
}

/* ---------------- Generic SVG icons ---------------- */

type IconProps = { className?: string };

function Svg({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export const SearchIcon = ({ className }: IconProps) => (
  <Svg className={className}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></Svg>
);

export const PlayIcon = ({ className }: IconProps) => (
  <Svg className={className}><polygon points="6 3 20 12 6 21 6 3" fill="currentColor" stroke="none" /></Svg>
);

export const SparkleIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" fill="currentColor" stroke="none" />
    <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z" fill="currentColor" stroke="none" />
  </Svg>
);

export const RefreshIcon = ({ className }: IconProps) => (
  <Svg className={className}><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></Svg>
);

export const ChevronRight = ({ className }: IconProps) => (
  <Svg className={className}><path d="m9 18 6-6-6-6" /></Svg>
);

export const ChevronDown = ({ className }: IconProps) => (
  <Svg className={className}><path d="m6 9 6 6 6-6" /></Svg>
);

export const XIcon = ({ className }: IconProps) => (
  <Svg className={className}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Svg>
);

export const CheckIcon = ({ className }: IconProps) => (
  <Svg className={className}><path d="M20 6 9 17l-5-5" /></Svg>
);

export const AlertIcon = ({ className }: IconProps) => (
  <Svg className={className}><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z" /><path d="M12 9v4" /><path d="M12 17h.01" /></Svg>
);

export const InfoIcon = ({ className }: IconProps) => (
  <Svg className={className}><circle cx="12" cy="12" r="9" /><path d="M12 16v-4" /><path d="M12 8h.01" /></Svg>
);

export const FolderIcon = ({ className, open }: IconProps & { open?: boolean }) => (
  <Svg className={className}>
    {open ? (
      <path d="M2 8a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8z" />
    ) : (
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    )}
  </Svg>
);

export const BranchIcon = ({ className }: IconProps) => (
  <Svg className={className}><path d="M6 3v12" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" /></Svg>
);

export const SaveIcon = ({ className }: IconProps) => (
  <Svg className={className}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><path d="M17 21v-8H7v8" /><path d="M7 3v5h8" /></Svg>
);

export const UndoIcon = ({ className }: IconProps) => (
  <Svg className={className}><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-15-6.7L3 13" /></Svg>
);

export const PanelLeftIcon = ({ className }: IconProps) => (
  <Svg className={className}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" /></Svg>
);

export const ZapIcon = ({ className }: IconProps) => (
  <Svg className={className}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor" stroke="none" /></Svg>
);

export const ShieldIcon = ({ className }: IconProps) => (
  <Svg className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></Svg>
);

export const UploadIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" x2="12" y1="3" y2="15" />
  </Svg>
);

export const ExternalLinkIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </Svg>
);

export const SunIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" /><path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" /><path d="M20 12h2" />
    <path d="m4.93 19.07 1.41-1.41" /><path d="m17.66 6.34 1.41-1.41" />
  </Svg>
);

export const MoonIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </Svg>
);

