"use client";

import type { CSSProperties, ReactNode } from "react";

type OverlayFrameProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  edge?: number;
  innerEdge?: number;
  basePath?: string;
};

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function OverlayFrame({
  children,
  className,
  contentClassName,
  edge = 32,
  innerEdge = 32,
  basePath = "/sprites/ui/overlay",
}: OverlayFrameProps) {
  const edgePx = `${edge}px`;
  const innerEdgePx = `${innerEdge}px`;
  const outsideGrow = Math.max(0, edge - innerEdge);
  const outsideGrowPx = `${outsideGrow}px`;
  const tileSize = `${edgePx} ${edgePx}`;

  const bgStyle = (image: string, repeat: CSSProperties["backgroundRepeat"]): CSSProperties => ({
    backgroundImage: `url('${basePath}/${image}')`,
    backgroundRepeat: repeat,
    backgroundSize: tileSize,
    imageRendering: "pixelated",
  });

  return (
    <div className={joinClasses("relative", className)}>
      <div
        className="absolute z-0 pointer-events-none"
        style={{ top: `-${outsideGrowPx}`, right: `-${outsideGrowPx}`, bottom: `-${outsideGrowPx}`, left: `-${outsideGrowPx}` }}
        aria-hidden="true"
      >
        <div
          className="absolute top-0 left-0"
          style={{ width: edgePx, height: edgePx, ...bgStyle("overlay_tl_01.png", "no-repeat") }}
        />
        <div
          className="absolute top-0"
          style={{ left: edgePx, right: edgePx, height: edgePx, ...bgStyle("overlay_tm_01.png", "repeat-x") }}
        />
        <div
          className="absolute top-0 right-0"
          style={{ width: edgePx, height: edgePx, ...bgStyle("overlay_tr_01.png", "no-repeat") }}
        />

        <div
          className="absolute left-0"
          style={{ top: edgePx, bottom: edgePx, width: edgePx, ...bgStyle("overlay_ml_01.png", "repeat-y") }}
        />
        <div
          className="absolute"
          style={{ top: edgePx, right: edgePx, bottom: edgePx, left: edgePx, ...bgStyle("overlay_fill_01.png", "repeat") }}
        />
        <div
          className="absolute right-0"
          style={{ top: edgePx, bottom: edgePx, width: edgePx, ...bgStyle("overlay_mr_01.png", "repeat-y") }}
        />

        <div
          className="absolute bottom-0 left-0"
          style={{ width: edgePx, height: edgePx, ...bgStyle("overlay_dl_01.png", "no-repeat") }}
        />
        <div
          className="absolute bottom-0"
          style={{ left: edgePx, right: edgePx, height: edgePx, ...bgStyle("overlay_dm_01.png", "repeat-x") }}
        />
        <div
          className="absolute right-0 bottom-0"
          style={{ width: edgePx, height: edgePx, ...bgStyle("overlay_dr_01.png", "no-repeat") }}
        />
      </div>

      <div
        className={joinClasses("relative z-10 box-border w-full h-full", contentClassName)}
        style={{ padding: innerEdgePx }}
      >
        {children}
      </div>
    </div>
  );
}
