"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Reveals [data-reveal] elements as they enter the viewport. Uses the Web
 * Animations API (fill: forwards) instead of toggling classes, so it never
 * touches attributes React is still hydrating. Content is fully visible
 * without JS (the `.js` class gates the hidden state).
 */
export function RevealObserver() {
  const pathname = usePathname();
  useEffect(() => {
    document.documentElement.classList.add("js");
    const seen = new WeakSet<Element>();
    const show = (el: Element, animate: boolean) => {
      const delay = parseFloat(getComputedStyle(el).getPropertyValue("--reveal-delay")) || 0;
      (el as HTMLElement).animate(
        [{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "none" }],
        { duration: animate ? 800 : 0, delay: animate ? delay : 0, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" },
      );
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      document.querySelectorAll("[data-reveal]").forEach((el) => show(el, false));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { show(e.target, true); io.unobserve(e.target); }
      }),
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    const scan = () => document.querySelectorAll("[data-reveal]").forEach((el) => {
      if (seen.has(el)) return;
      seen.add(el);
      io.observe(el);
    });
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, [pathname]);
  return null;
}
