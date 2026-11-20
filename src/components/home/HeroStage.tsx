"use client";
import { useEffect, useRef } from "react";
import { ArrowDown } from "lucide-react";
import { gsap, prefersReduced } from "@/lib/gsap";
import type { HeroState } from "@/components/three/heroScene";

/**
 * The 3D scene reads a shared state object every frame (no React renders):
 * `intro` drives the load choreography, `progress` the cavity-removal sequence,
 * which plays once on its own. The page scrolls freely — nothing is pinned.
 */
export function HeroStage({ title, accent, subtitle }: { title: string; accent: string; subtitle: string }) {
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = section.current, cv = canvas.current;
    if (!el || !cv) return;
    const reduced = prefersReduced();
    const state: HeroState = { intro: reduced ? 1 : 0, progress: reduced ? 0.7 : 0, px: 0, py: 0, reduced };
    let dispose: (() => void) | undefined;
    let cancelled = false;

    import("@/components/three/heroScene").then(({ mountHeroScene }) => {
      if (cancelled) return;
      try {
        dispose = mountHeroScene(cv, state, () => el.setAttribute("data-ready", "1"));
      } catch {
        el.setAttribute("data-ready", "0");
      }
      if (!reduced) gsap.to(state, { intro: 1, duration: 3.2, ease: "none", delay: 0.15 });
    });

    const ctx = gsap.context(() => {
      // headline: masked word rise
      gsap.fromTo(".hero-word > span", { yPercent: 115, y: 0, rotate: 4 }, {
        yPercent: 0, rotate: 0, duration: 1.25, stagger: 0.08, ease: "expo.out", delay: 0.25,
        // release the masks so italic overhangs are never clipped
        onComplete: () => el.querySelectorAll<HTMLElement>(".hero-word").forEach((n) => (n.style.overflow = "visible")),
      });
      gsap.fromTo(".hero-fade", { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.1, delay: 0.85 });
      if (reduced) return;
      // the procedure plays on its own once — no scroll locking
      gsap.to(state, { progress: 1, duration: 7, ease: "power1.inOut", delay: 2.6 });
    }, el);

    const move = (e: PointerEvent) => {
      state.px = (e.clientX / window.innerWidth) * 2 - 1;
      state.py = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", move, { passive: true });

    return () => {
      cancelled = true;
      window.removeEventListener("pointermove", move);
      ctx.revert();
      gsap.killTweensOf(state);
      dispose?.();
    };
  }, []);

  const words = title.split(" ");
  return (
    <section ref={section} className="hero relative isolate overflow-hidden bg-white md:h-[100svh] md:min-h-[620px]" aria-labelledby="hero-title">
      {/* studio backdrop: aqua glow + millimetre grid */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(60%_55%_at_68%_52%,#e3f4f5_0%,rgba(255,255,255,0)_70%)] max-md:bg-[radial-gradient(80%_45%_at_50%_70%,#e3f4f5_0%,rgba(255,255,255,0)_70%)]" />
        <div className="mm-grid absolute inset-0 opacity-[0.5]" />
      </div>

      <div className="hero-canvas pointer-events-none absolute inset-x-0 bottom-0 h-[clamp(300px,46svh,440px)] opacity-0 md:inset-0 md:h-auto transition-opacity duration-[1.4s] [[data-ready='1']_&]:opacity-100">
        <canvas ref={canvas} className="block size-full" aria-hidden />
      </div>

      <div className="container-x relative flex flex-col justify-start pb-[clamp(300px,46svh,440px)] pt-[7svh] md:h-full md:justify-center md:pb-0 md:pt-0">
        <div className="hero-copy max-w-[40rem]">
          <p className="hero-fade eyebrow mb-4 md:mb-6">Al Esraa Dental Store — Est. for dentistry</p>
          <h1 id="hero-title" className="display text-[clamp(3.1rem,8.4vw,7.6rem)] leading-[0.9]">
            {words.map((w, i) => (
              <span key={i} className="hero-word -mb-[0.12em] inline-block overflow-hidden pb-[0.14em] align-bottom">
                <span className="inline-block">{w}&nbsp;</span>
              </span>
            ))}
            <span className="hero-word -mb-[0.12em] inline-block overflow-hidden pb-[0.14em] align-bottom">
              <span className="inline-block font-serif font-normal italic tracking-[-0.02em] text-teal-strong">{accent}</span>
            </span>
          </h1>
          <p className="hero-fade mt-4 max-w-[26rem] text-base md:mt-6 md:text-lg leading-relaxed text-muted md:text-xl">{subtitle}</p>
          <div className="hero-fade mt-7 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap md:mt-9">
            <a href="#for-students" onClick={() => window.dispatchEvent(new CustomEvent("eds:path", { detail: "student" }))} className="btn btn-primary btn-lg max-sm:px-3">
              I&apos;m a student <ArrowDown className="size-4" />
            </a>
            <a href="#for-dentists" onClick={() => window.dispatchEvent(new CustomEvent("eds:path", { detail: "dentist" }))} className="btn btn-ghost btn-lg max-sm:px-3">
              I&apos;m a dentist <ArrowDown className="size-4" />
            </a>
          </div>
        </div>

      </div>
    </section>
  );
}
