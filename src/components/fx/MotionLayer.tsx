"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { gsap, prefersReduced, ScrollTrigger } from "@/lib/gsap";

/**
 * Declarative scroll choreography for server-rendered sections:
 *   data-split            words (rendered by <Words>) rise from a mask on enter
 *   data-rise             element rises in on enter (data-rise="0.1" = delay)
 *   data-stagger          direct children rise in sequence
 * Light, one-shot reveals only: nothing is tied to the scroll position, the
 * cursor is the system cursor, and buttons/cards don't follow the pointer.
 */
/** Rendered at the end of a page: tells <MotionLayer> that the page has hydrated. */
export function MotionReady() {
  const pathname = usePathname();
  useEffect(() => {
    (window as Window & { __edsMotionReady?: string }).__edsMotionReady = pathname;
    window.dispatchEvent(new Event("eds:motion-scan"));
  }, [pathname]);
  return null;
}

export function MotionLayer() {
  const pathname = usePathname();

  useEffect(() => {
    if (prefersReduced()) return;
    let ctx: gsap.Context | null = null;
    const scan = () => {
    ctx?.revert();
    ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-split]").forEach((el) => {
        const words = el.querySelectorAll(".w > span");
        if (!words.length) return;
        gsap.fromTo(words, { yPercent: 110, y: 0 }, {
          yPercent: 0, duration: 1.1, ease: "expo.out", stagger: 0.05,
          onComplete: () => el.querySelectorAll<HTMLElement>(".w").forEach((n) => (n.style.overflow = "visible")),
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
      });
      gsap.utils.toArray<HTMLElement>("[data-rise]").forEach((el) => {
        gsap.fromTo(el, { autoAlpha: 0, y: 48 }, {
          autoAlpha: 1, y: 0, duration: 1.1, delay: Number(el.dataset.rise) || 0,
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
        });
      });
      gsap.utils.toArray<HTMLElement>("[data-stagger]").forEach((el) => {
        if (!el.children.length) return;
        gsap.fromTo(el.children, { autoAlpha: 0, y: 40 }, {
          autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.07, clearProps: "transform",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
      });
    });
    };
    // Scan only after the page's (streamed) content has hydrated: pages render
    // <MotionReady/>, which fires this event from its effect.
    let done = false;
    const onReady = () => {
      done = true;
      scan();
      window.setTimeout(() => ScrollTrigger.refresh(), 600); // fonts & images settle
    };
    window.addEventListener("eds:motion-scan", onReady);
    if ((window as Window & { __edsMotionReady?: string }).__edsMotionReady === pathname) onReady();
    // pages without <MotionReady/> still get their effects
    const fallback = window.setTimeout(() => { if (!done) onReady(); }, 1800);
    return () => { window.clearTimeout(fallback); window.removeEventListener("eds:motion-scan", onReady); ctx?.revert(); };
  }, [pathname]);

  return null;
}
