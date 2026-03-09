"use client";

import type { CSSProperties } from "react";

type OverlayTitlePillProps = {
  title: string;
  className?: string;
  width?: number | string;
  textClassName?: string;
  basePath?: string;
};

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function OverlayTitlePill({
  title,
  className,
  width = 240,
  textClassName,
  basePath = "/sprites/ui/overlay",
}: OverlayTitlePillProps) {
  const widthValue = typeof width === "number" ? `${width}px` : width;
  const imageStyle: CSSProperties = { imageRendering: "pixelated" };

  return (
    <div className={joinClasses("pointer-events-none relative", className)} style={{ width: widthValue }}>
      <img
        src={`${basePath}/overlay_common_01_clean.png`}
        alt=""
        className="w-full h-8 object-fill"
        style={imageStyle}
      />
      <div className={joinClasses("absolute inset-0 flex items-center justify-center px-3", textClassName)}>
        <span className="font-pixel text-[14px] leading-none text-white tracking-wide uppercase">
            {title}
        </span>
      </div>
    </div>
  );
}
