"use client";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { StageItem, StageState } from "./stageScene";

/** Phones, weak or data-saving devices skip the decorative 3D entirely (the section reads fine without it). */
function canAfford3D() {
  if (window.matchMedia("(max-width: 767px), (pointer: coarse)").matches) return false;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return false;
  if ((nav.deviceMemory ?? 8) < 4) return false;
  if ((nav.hardwareConcurrency ?? 8) < 4) return false;
  return true;
}

/**
 * Floating 3D instruments (WebGL). Decorative: hidden from assistive tech.
 * three.js loads only when the stage nears the viewport and the browser is idle;
 * frames render only while scroll or pointer input is moving the set.
 */
export function InstrumentStage({ items, dark = false, spin = 1, className }: { items: StageItem[]; dark?: boolean; spin?: number; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const key = JSON.stringify(items);

  useEffect(() => {
    const el = host.current, cv = canvas.current;
    if (!el || !cv || !canAfford3D()) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const state: StageState = { progress: 0.5, px: 0, py: 0, reduced };
    let dispose: (() => void) | undefined;
    let cancelled = false;
    let idle = 0;

    const onScroll = () => {
      const r = el.getBoundingClientRect(), vh = window.innerHeight;
      state.progress = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
      state.kick?.();
    };
    const move = (e: PointerEvent) => {
      state.px = (e.clientX / window.innerWidth) * 2 - 1;
      state.py = (e.clientY / window.innerHeight) * 2 - 1;
      state.kick?.();
    };

    const mount = () => {
      import("./stageScene").then(({ mountStage }) => {
        if (cancelled) return;
        try {
          onScroll();
          dispose = mountStage(cv, JSON.parse(key) as StageItem[], state, { dark, spin });
          el.dataset.ready = "1";
          window.addEventListener("scroll", onScroll, { passive: true });
          window.addEventListener("pointermove", move, { passive: true });
        } catch { /* no WebGL: the stage simply stays empty */ }
      });
    };
    const near = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      near.disconnect();
      const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
      if (ric) idle = ric(mount, { timeout: 2000 }); else idle = window.setTimeout(mount, 300);
    }, { rootMargin: "200px" });
    near.observe(el);

    return () => {
      cancelled = true;
      near.disconnect();
      const cic = (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback;
      if (cic) cic(idle); else window.clearTimeout(idle);
      window.removeEventListener("scroll", onScroll);
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
