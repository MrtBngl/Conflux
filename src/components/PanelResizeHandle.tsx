import { Separator } from "react-resizable-panels";
import { cn } from "../utils/cn";

export function PanelResizeHandle({
  direction,
  className,
}: {
  direction: "horizontal" | "vertical";
  className?: string;
}) {
  const isHorizontal = direction === "horizontal";

  const handlePointerDown = () => {
    document.body.classList.add("is-resizing");
    const cleanup = () => {
      document.body.classList.remove("is-resizing");
      window.removeEventListener("pointerup", cleanup);
      window.removeEventListener("pointercancel", cleanup);
    };
    window.addEventListener("pointerup", cleanup);
    window.addEventListener("pointercancel", cleanup);
  };

  return (
    <Separator
      onPointerDown={handlePointerDown}
      className={cn(
        "group relative z-20 shrink-0 bg-zinc-800/80 transition-colors hover:bg-violet-500/50 data-[separator=active]:bg-violet-500/60 data-[separator=hover]:bg-violet-500/50",
        isHorizontal ? "w-1.5 cursor-col-resize" : "h-1.5 cursor-row-resize",
        className
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute rounded-full bg-zinc-600 opacity-0 transition group-hover:opacity-100 group-data-[separator=active]:bg-violet-300 group-data-[separator=active]:opacity-100",
          isHorizontal
            ? "left-1/2 top-1/2 h-8 w-1 -translate-x-1/2 -translate-y-1/2"
            : "left-1/2 top-1/2 h-1 w-8 -translate-x-1/2 -translate-y-1/2"
        )}
      />
    </Separator>
  );
}
