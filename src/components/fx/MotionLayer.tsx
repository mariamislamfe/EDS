"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Declarative one-shot reveals for server-rendered sections:
 *   data-split            words (rendered by <Words>) rise from a mask on enter
 *   data-rise             element rises in on enter (data-rise="0.1" = delay, seconds)
 *   data-stagger          direct children rise in sequence
 * IntersectionObserver + the Web Animations API (fill: forwards): no animation
 * library, nothing tied to scroll position, and React's attributes are never
 * touched. The hidden first-paint state lives in globals.css behind `.js`.
 */
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

/** Kept for pages that still render it; reveals no longer wait for it. */
export function MotionReady() {
  return null;
}

function play(el: HTMLElement, instant: boolean) {
  const t = (ms: number) => (instant ? 0 : ms);
  if (el.hasAttribute("data-split")) {
    el.querySelectorAll<HTMLElement>(".w > span").forEach((w, i) =>
      w.animate([{ transform: "translateY(110%)" }, { transform: "none" }],
        { duration: t(1000), delay: t(i * 50), easing: EASE, fill: "forwards" }));
  }
  if (el.hasAttribute("data-rise")) {
    el.animate([{ opacity: 0, transform: "translateY(40px)" }, { opacity: 1, transform: "none" }],
      { duration: t(1000), delay: t((Number(el.dataset.rise) || 0) * 1000), easing: EASE, fill: "forwards" });
  }
  if (el.hasAttribute("data-stagger")) {
    Array.from(el.children).forEach((c, i) =>
      (c as HTMLElement).animate([{ opacity: 0, transform: "translateY(32px)" }, { opacity: 1, transform: "none" }],
        { duration: t(850), delay: t(Math.min(i, 10) * 70), easing: EASE, fill: "forwards" }));
  }
}

export function MotionLayer() {
  const pathname = usePathname();

  useEffect(() => {
    const instant = window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window);
    const seen = new WeakSet<Element>();
    const io = instant ? null : new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (!e.isIntersecting) return;
        play(e.target as HTMLElement, false);
        io!.unobserve(e.target);
      }),
      { rootMargin: "0px 0px -10% 0px", threshold: 0.01 },
    );
    const scan = () => document.querySelectorAll<HTMLElement>("[data-split],[data-rise],[data-stagger]").forEach((el) => {
      if (seen.has(el)) return;
      seen.add(el);
      if (io) io.observe(el); else play(el, true);
    });
    // WAAPI never touches React's attributes, so scanning before hydration is safe;
    // the observer picks up sections that stream in later.
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { mo.disconnect(); io?.disconnect(); };
  }, [pathname]);

  return null;
}
