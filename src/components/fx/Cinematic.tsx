"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Cinematic scene change between the store's worlds (Students / Dentists / Clinic).
 * A full-screen curtain plays the world's title card, the route changes underneath,
 * and the curtain lifts once the new page is on screen. Transform/opacity only.
 */
export type World = "students" | "dentists" | "clinic";
type Scene = { world: World; href: string; phase: "in" | "out"; at: number };

const EVENT = "eds:enter-world";
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function enterWorld(world: World, href: string) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { world, href } }));
}

/** A link that plays the world's title card before navigating. */
export function WorldLink({ world, href, className, children, ...rest }: {
  world: World; href: string; className?: string; children: React.ReactNode;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return (
    <Link
      href={href}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 || reduced()) return;
        e.preventDefault();
        enterWorld(world, href);
      }}
      {...rest}
    >
      {children}
    </Link>
  );
}

const COPY: Record<World, { kicker: string; title: React.ReactNode; caption: string }> = {
  students: {
    kicker: "Entering — Journey 01",
    title: <>Students<span className="font-serif font-normal italic text-teal-strong">.</span></>,
    caption: "Your year · your subjects · your kit",
  },
  dentists: {
    kicker: "Entering — Journey 02",
    title: <><span className="font-serif font-normal italic text-teal">D</span>entists</>,
    caption: "Clinical grade · by specialty",
  },
  clinic: {
    kicker: "Entering — Clinic setup",
    title: <>Your <span className="font-serif font-normal italic text-teal">clinic.</span></>,
    caption: "From the first chair to the last bur",
  },
};

export function CinematicHost() {
  const router = useRouter();
  const pathname = usePathname();
  const [scene, setScene] = useState<Scene | null>(null);
  const navTimer = useRef(0);

  useEffect(() => {
    const onEnter = (e: Event) => {
      const { world, href } = (e as CustomEvent<{ world: World; href: string }>).detail;
      router.prefetch(href);
      document.documentElement.style.overflow = "hidden";
      setScene({ world, href, phase: "in", at: performance.now() });
      window.clearTimeout(navTimer.current);
      navTimer.current = window.setTimeout(() => {
        router.push(href, { scroll: true });
      }, 900);
    };
    window.addEventListener(EVENT, onEnter);
    return () => window.removeEventListener(EVENT, onEnter);
  }, [router]);

  // lift the curtain when the destination page is on screen
  useEffect(() => {
    if (!scene || scene.phase !== "in") return;
    const target = scene.href.split(/[?#]/)[0];
    if (pathname !== target) return;
    const wait = Math.max(0, 1250 - (performance.now() - scene.at));
    const t = window.setTimeout(() => {
      window.scrollTo(0, 0);
      setScene((s) => (s ? { ...s, phase: "out" } : s));
    }, wait);
    return () => window.clearTimeout(t);
  }, [pathname, scene]);

  // finish (and a safety net if navigation never happens)
  useEffect(() => {
    if (!scene) return;
    const t = window.setTimeout(() => {
      document.documentElement.style.overflow = "";
      setScene(null);
      window.dispatchEvent(new Event("eds:world-entered"));
    }, scene.phase === "out" ? 900 : 7000);
    return () => window.clearTimeout(t);
  }, [scene]);

  if (!scene) return null;
  const c = COPY[scene.world];
  const dark = scene.world !== "students";
  return (
    <div aria-hidden className={cn("cine-curtain fixed inset-0 z-[200]", scene.phase === "out" && "is-out", dark ? "on-dark bg-navy-deep text-white" : "bg-aqua text-navy-deep")}>
      <div className={cn("absolute inset-0", dark ? "mm-grid-dark" : "mm-grid")} />
      {scene.world === "dentists" && <div className="cine-scan absolute inset-y-0 w-[30vw] bg-[linear-gradient(90deg,transparent,rgb(101_194_199/0.22),transparent)]" />}
      {scene.world === "clinic" && <div className="cine-blueprint absolute inset-[8vmin] rounded-[2rem] border border-teal/30" />}
      <div className="cine-content relative flex h-full flex-col items-center justify-center px-6 text-center">
        <p className="cine-kicker eyebrow">{c.kicker}</p>
        <p className="cine-title display mt-5 whitespace-nowrap text-[clamp(4.5rem,17vw,16rem)] leading-[0.85] tracking-[-0.06em]">{c.title}</p>
        <div className="cine-rule mt-8 h-px w-[min(28rem,70vw)] bg-current opacity-30" />
        <p className="cine-caption mt-5 font-mono text-xs uppercase tracking-[0.2em] opacity-70">{c.caption}</p>
        {scene.world === "students" && (
          <ol className="cine-years mt-10 flex gap-3 font-mono text-sm">
            {[1, 2, 3, 4, 5].map((n) => <li key={n} className="grid size-11 place-items-center rounded-full border border-navy/20" style={{ animationDelay: `${380 + n * 70}ms` }}>0{n}</li>)}
          </ol>
        )}
      </div>
      <div className="cine-bar absolute inset-x-0 top-0 h-[7vh] bg-abyss" />
      <div className="cine-bar cine-bar-b absolute inset-x-0 bottom-0 h-[7vh] bg-abyss" />
    </div>
  );
}
