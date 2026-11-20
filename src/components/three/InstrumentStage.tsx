"use client";
import { useEffect, useRef } from "react";
import { prefersReduced, ScrollTrigger } from "@/lib/gsap";
import { cn } from "@/lib/utils";
import type { StageItem, StageState } from "./stageScene";

/** Floating 3D instruments (WebGL). Decorative: hidden from assistive tech. */
export function InstrumentStage({ items, dark = false, spin = 1, className }: { items: StageItem[]; dark?: boolean; spin?: number; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const key = JSON.stringify(items);

  useEffect(() => {
    const el = host.current, cv = canvas.current;
    if (!el || !cv) return;
    const state: StageState = { progress: 0.5, px: 0, py: 0, reduced: prefersReduced() };
    let dispose: (() => void) | undefined;
    let cancelled = false;
    import("./stageScene").then(({ mountStage }) => {
      if (cancelled) return;
      try {
        dispose = mountStage(cv, JSON.parse(key) as StageItem[], state, { dark, spin });
        el.dataset.ready = "1";
      } catch { /* no WebGL: the stage simply stays empty */ }
    });
    const st = ScrollTrigger.create({
      trigger: el, start: "top bottom", end: "bottom top",
      onUpdate: (s) => { state.progress = s.progress; },
    });
    const move = (e: PointerEvent) => {
      state.px = (e.clientX / window.innerWidth) * 2 - 1;
      state.py = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      cancelled = true;
      st.kill();
      window.removeEventListener("pointermove", move);
      dispose?.();
    };
  }, [key, dark, spin]);

  return (
    <div ref={host} aria-hidden className={cn("pointer-events-none opacity-0 transition-opacity duration-1000 data-[ready=1]:opacity-100", className)}>
      <canvas ref={canvas} className="block size-full" />
    </div>
  );
}
