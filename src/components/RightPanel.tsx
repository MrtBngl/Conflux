import { useMemo, useState } from "react";
import { Group, Panel } from "react-resizable-panels";
import { ANALYSIS_STEPS, type AnalysisResult, type Finding, type Severity } from "../lib/analyze";
import { cn } from "../utils/cn";
import { PanelResizeHandle } from "./PanelResizeHandle";
import {
  AlertIcon,
  CheckIcon,
  ExternalLinkIcon,
  InfoIcon,
  RefreshIcon,
  SparkleIcon,
  ZapIcon,
} from "./icons";

export interface AnalysisState {
  analyzing: boolean;
  stepIndex: number;
  result: AnalysisResult | null;
  hasRun: boolean;
}

interface Props {
  previewSrc: string;
  onRefreshPreview: () => void;
  analysis: AnalysisState;
  onApplyFix: (finding: Finding) => void;
}

type DeviceView = "desktop" | "tablet" | "mobile";

const DEVICE_WIDTH: Record<DeviceView, string | null> = {
  desktop: null,
  tablet: "768px",
  mobile: "375px",
};

const SEVERITY_META: Record<Severity, { ring: string; bg: string; text: string; label: string }> = {
  critical: {
    ring: "ring-rose-500/30",
    bg: "bg-rose-500/10",
    text: "text-rose-300",
    label: "Breaking",
  },
  warning: {
    ring: "ring-amber-500/30",
    bg: "bg-amber-500/10",
    text: "text-amber-300",
    label: "Warning",
  },
  info: {
    ring: "ring-sky-500/30",
    bg: "bg-sky-500/10",
    text: "text-sky-300",
    label: "Info",
  },
};

function SeverityIcon({ severity, className }: { severity: Severity; className?: string }) {
  if (severity === "critical") return <AlertIcon className={className} />;
  if (severity === "warning") return <AlertIcon className={className} />;
  return <InfoIcon className={className} />;
}

function PreviewPane({
  previewSrc,
  onRefreshPreview,
}: {
  previewSrc: string;
  onRefreshPreview: () => void;
}) {
  const [device, setDevice] = useState<DeviceView>("desktop");
  const [zoomFit, setZoomFit] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const deviceWidth = DEVICE_WIDTH[device];

  const openInNewTab = () => {
    const blob = new Blob([previewSrc], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const handleRefresh = () => {
    setIframeKey((k) => k + 1);
    onRefreshPreview();
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-zinc-800/70 bg-zinc-900/40 px-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-pulse rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Live UI Preview
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoomFit((z) => !z)}
            className="rounded px-2 py-0.5 font-mono text-[10px] font-semibold text-zinc-400 border border-zinc-700/70 hover:bg-zinc-800 hover:text-zinc-200 transition"
            title="Toggle preview zoom mode"
          >
            {zoomFit ? "Fit (85%)" : "100%"}
          </button>
          <span className="h-3 w-px bg-zinc-700" />
          {(
            [
              { id: "desktop" as const, label: "Desktop", icon: "🖥️" },
              { id: "tablet" as const, label: "Tablet", icon: "📱" },
              { id: "mobile" as const, label: "Mobile", icon: "📱" },
            ] as const
          ).map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDevice(d.id)}
              title={d.label}
              className={cn(
                "rounded px-1.5 py-0.5 text-[11px] transition",
                device === d.id
                  ? "bg-violet-500/20 text-violet-200 ring-1 ring-violet-500/40"
                  : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
              )}
            >
              {d.icon}
            </button>
          ))}
        </div>
      </div>

      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-zinc-800/70 bg-zinc-900/60 px-3">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
        <div className="ml-2 flex h-5 min-w-0 flex-1 items-center rounded-md bg-zinc-950 px-2 font-mono text-[10px] text-zinc-500">
          sandbox://preview/app
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className="flex items-center gap-1 rounded-md border border-zinc-700/70 px-2 py-0.5 text-[10px] text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
          title="Refresh preview"
        >
          <RefreshIcon className="h-3 w-3" />
          Refresh
        </button>
        <button
          type="button"
          onClick={openInNewTab}
          className="flex items-center gap-1 rounded-md border border-zinc-700/70 px-2 py-0.5 text-[10px] text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
          title="Open in new tab"
        >
          <ExternalLinkIcon className="h-3 w-3" />
          New Tab
        </button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-zinc-950">
        <div className="flex h-full w-full items-start justify-center overflow-auto p-2">
          <div
            className="h-full overflow-hidden rounded-lg border border-zinc-800/80 bg-zinc-950 shadow-inner transition-[width] duration-200"
            style={{
              width: deviceWidth ?? "100%",
              maxWidth: "100%",
            }}
          >
            <div
              className="h-full w-full origin-top-left overflow-hidden"
              style={
                zoomFit
                  ? {
                      transform: "scale(0.85)",
                      width: `${100 / 0.85}%`,
                      height: `${100 / 0.85}%`,
                    }
                  : {
                      transform: "none",
                      width: "100%",
                      height: "100%",
                    }
              }
            >
              <iframe
                key={iframeKey}
                title="Live UI Preview"
                sandbox="allow-scripts allow-same-origin allow-modals allow-forms allow-popups"
                srcDoc={previewSrc}
                className="h-full w-full border-0 bg-white"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ analysis }: { analysis: AnalysisState }) {
  if (analysis.analyzing) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-2.5">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-400/40 border-t-violet-300" />
        <span className="text-sm font-semibold text-violet-200">Analyzing integration…</span>
      </div>
    );
  }
  if (!analysis.result) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-700 px-4 py-2.5 text-sm text-zinc-500">
        <ZapIcon className="h-4 w-4 text-zinc-600" />
        Awaiting analysis — click “Run / Test Integration”.
      </div>
    );
  }
  const compatible = analysis.result.status === "compatible";
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-4 py-2.5 ring-1 transition-all duration-300",
        compatible
          ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/40 shadow-[0_0_24px_rgba(16,185,129,0.18)]"
          : "bg-rose-500/10 text-rose-300 ring-rose-500/40 shadow-[0_0_24px_rgba(244,63,94,0.18)]"
      )}
    >
      <span className="text-base leading-none">{compatible ? "🟢" : "🔴"}</span>
      <div className="leading-tight">
        <div className="text-sm font-bold tracking-wide">
          {compatible ? "COMPATIBLE" : "CONFLICT DETECTED"}
        </div>
        <div className={cn("text-[11px]", compatible ? "text-emerald-300/80" : "text-rose-300/80")}>
          {compatible ? "Code integrates smoothly" : "Syntax / API error"}
        </div>
      </div>
    </div>
  );
}

function AnalyzingView({ stepIndex }: { stepIndex: number }) {
  return (
    <div className="space-y-4">
      <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300"
          style={{ width: `${Math.round(((stepIndex + 1) / ANALYSIS_STEPS.length) * 100)}%` }}
        />
      </div>
      <ul className="space-y-2">
        {ANALYSIS_STEPS.map((step, i) => {
          const done = i < stepIndex;
          const current = i === stepIndex;
          return (
            <li key={step} className="flex items-center gap-2.5 text-xs">
              {done ? (
                <CheckIcon className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
              ) : current ? (
                <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-violet-400/40 border-t-violet-300" />
              ) : (
                <span className="ml-1 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-700" />
              )}
              <span className={cn(done ? "text-zinc-400" : current ? "text-violet-200" : "text-zinc-600")}>
                {step}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function FindingCard({ finding, onApplyFix }: { finding: Finding; onApplyFix: (f: Finding) => void }) {
  const meta = SEVERITY_META[finding.severity];
  return (
    <div className={cn("rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 ring-1", meta.ring)}>
      <div className="flex items-start gap-2">
        <SeverityIcon severity={finding.severity} className={cn("mt-0.5 h-4 w-4 shrink-0", meta.text)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-100">{finding.title}</span>
            <span className={cn("rounded px-1 py-px text-[9px] font-bold uppercase tracking-wider", meta.bg, meta.text)}>
              {meta.label}
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">{finding.detail}</p>
          <div className="mt-2 rounded-md border border-zinc-800 bg-zinc-950/70 p-2">
            <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              <SparkleIcon className="h-3 w-3 text-violet-400" />
              Quick fix
            </div>
            <p className="text-[11px] text-zinc-300">{finding.fix}</p>
            {finding.applyFix && (
              <button
                onClick={() => onApplyFix(finding)}
                className="mt-2 inline-flex items-center gap-1 rounded-md bg-violet-500/15 px-2 py-1 text-[11px] font-medium text-violet-200 ring-1 ring-violet-500/40 transition hover:bg-violet-500/25"
              >
                <ZapIcon className="h-3 w-3" />
                Apply fix
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalysisCard({ analysis, onApplyFix }: { analysis: AnalysisState; onApplyFix: (f: Finding) => void }) {
  if (analysis.analyzing) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="mb-3 flex items-center gap-2">
            <SparkleIcon className="h-4 w-4 text-violet-400" />
            <span className="text-xs font-semibold text-zinc-200">AI Analysis</span>
            <span className="ml-auto rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">
              conflux-ai · review-v2
            </span>
          </div>
          <AnalyzingView stepIndex={analysis.stepIndex} />
        </div>
      </div>
    );
  }

  if (!analysis.result) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-center">
        <div className="max-w-[260px] space-y-2">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800/70 ring-1 ring-zinc-700">
            <SparkleIcon className="h-5 w-5 text-violet-400" />
          </div>
          <p className="text-xs text-zinc-500">
            Run the integration test to generate an AI compatibility report for the active file.
          </p>
        </div>
      </div>
    );
  }

  const { result } = analysis;
  const criticals = result.findings.filter((f) => f.severity === "critical").length;
  const warnings = result.findings.filter((f) => f.severity === "warning").length;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-3">
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60">
        <div className="flex items-center gap-2 border-b border-zinc-800 p-3">
          <SparkleIcon className="h-4 w-4 text-violet-400" />
          <span className="text-xs font-semibold text-zinc-200">AI Analysis</span>
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">
            conflux-ai · review-v2
          </span>
          <span className="ml-auto font-mono text-[10px] text-zinc-500">{result.durationMs}ms</span>
        </div>

        <div className="border-b border-zinc-800 p-3">
          <p className="text-xs leading-relaxed text-zinc-300">{result.summary}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-zinc-400">{result.fileName}</span>
            {criticals > 0 && (
              <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-rose-300">
                {criticals} breaking
              </span>
            )}
            {warnings > 0 && (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-300">
                {warnings} warning
              </span>
            )}
            {criticals === 0 && warnings === 0 && (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-300">
                all checks passed
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {result.checksRun.map((c) => (
              <span
                key={c}
                className="flex items-center gap-1 rounded border border-zinc-700/70 bg-zinc-800/50 px-1.5 py-0.5 text-[10px] text-zinc-400"
              >
                <CheckIcon className="h-2.5 w-2.5 text-emerald-400" />
                {c}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-2 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Findings ({result.findings.length})
          </div>
          {result.findings.map((f) => (
            <FindingCard key={f.id} finding={f} onApplyFix={onApplyFix} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function RightPanel({ previewSrc, onRefreshPreview, analysis, onApplyFix }: Props) {
  const badgeKey = useMemo(
    () =>
      analysis.analyzing
        ? "running"
        : analysis.result
          ? `${analysis.result.status}-${analysis.result.findings.length}`
          : "idle",
    [analysis]
  );

  return (
    <div className="flex h-full w-full flex-col bg-zinc-900">
      <Group orientation="vertical" className="min-h-0 flex-1">
        <Panel defaultSize="50%" minSize="15%" maxSize="85%">
          <PreviewPane previewSrc={previewSrc} onRefreshPreview={onRefreshPreview} />
        </Panel>

        <PanelResizeHandle direction="vertical" />

        <Panel defaultSize="50%" minSize="15%" maxSize="85%">
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex h-9 shrink-0 items-center justify-between border-b border-zinc-800/70 bg-zinc-900/40 px-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Integration &amp; Compatibility Status
              </span>
              {analysis.result && !analysis.analyzing && (
                <span className="font-mono text-[10px] text-zinc-600">
                  {analysis.result.checksRun.length} checks
                </span>
              )}
            </div>

            <div key={badgeKey} className="shrink-0 px-3 pt-3">
              <StatusBadge analysis={analysis} />
            </div>

            <AnalysisCard analysis={analysis} onApplyFix={onApplyFix} />
          </div>
        </Panel>
      </Group>
    </div>
  );
}
