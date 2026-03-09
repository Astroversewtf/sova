"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useGameStore } from "@/stores/gameStore";

export function RunEndBackdropOverlay() {
  const runEndActive = useGameStore((s) => s.runEndActive);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!runEndActive) {
      setVisible(false);
      return;
    }
    setVisible(false);
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [runEndActive]);

  if (!mounted || !runEndActive) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[60] pointer-events-none transition-opacity duration-[1200ms] ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      style={{ background: "rgba(0,0,0,0.94)" }}
    />,
    document.body,
  );
}
