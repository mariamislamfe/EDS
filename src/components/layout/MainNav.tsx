"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Year = { slug: string; name: string; number: number; tagline: string; count: number };
type Item = { slug: string; name: string; count?: number; cover?: string | null };
type Panel = "students" | "dentists" | "categories" | null;

/**
 * Desktop navigation: a sliding indicator follows the hovered item, and three
 * mega panels (Students, Dentists, Categories) open below the bar.
 */
export function MainNav({ years, specialties, categories }: { years: Year[]; specialties: Item[]; categories: Item[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState<Panel>(null);
  const [pill, setPill] = useState<{ x: number; w: number; on: boolean }>({ x: 0, w: 0, on: false });
  const nav = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number>(0);

  useEffect(() => setOpen(null), [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const point = useCallback((el: HTMLElement | null) => {
    if (!el || !nav.current) return;
    const a = el.getBoundingClientRect(), b = nav.current.getBoundingClientRect();
    setPill({ x: a.left - b.left, w: a.width, on: true });
  }, []);

  const enter = (panel: Panel) => (e: React.SyntheticEvent<HTMLElement>) => {
    window.clearTimeout(closeTimer.current);
    point(e.currentTarget);
    setOpen(panel);
  };
  const leave = () => {
    closeTimer.current = window.setTimeout(() => { setOpen(null); setPill((p) => ({ ...p, on: false })); }, 140);
  };

  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const items: { href: string; label: string; panel: Panel }[] = [
    { href: "/", label: "Home", panel: null },
    { href: "/students", label: "Students", panel: "students" },
    { href: "/dentists", label: "Dentists", panel: "dentists" },
    { href: "/shop", label: "Categories", panel: "categories" },
    { href: "/about", label: "About", panel: null },
  ];

  return (
    <div className="hidden h-full lg:flex" onMouseLeave={leave}>
      <div ref={nav} className="relative flex h-full items-center">
        <span
          aria-hidden
          className="absolute top-1/2 h-9 -translate-y-1/2 rounded-full bg-aqua-2 transition-[transform,width,opacity] duration-500 ease-[var(--ease-out-soft)]"
          style={{ transform: `translate(${pill.x}px, -50%)`, width: pill.w, opacity: pill.on ? 1 : 0, left: 0 }}
        />
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            onMouseEnter={enter(it.panel)}
            onFocus={enter(it.panel)}
            aria-expanded={it.panel ? open === it.panel : undefined}
            aria-haspopup={it.panel ? "true" : undefined}
            className={cn(
              "relative z-10 flex h-9 items-center rounded-full px-4 text-[0.92rem] font-medium transition-colors",
              active(it.href) ? "text-navy-deep" : "text-ink/70 hover:text-navy-deep",
            )}
          >
            {it.label}
            {active(it.href) && <span aria-hidden className="absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-teal-strong" />}
          </Link>
        ))}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            key="mega"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-0 top-full border-y border-line bg-white/95 shadow-[0_40px_80px_-40px_rgb(2_42_82/0.35)] backdrop-blur-xl"
            onMouseEnter={() => window.clearTimeout(closeTimer.current)}
            onMouseLeave={leave}
          >
            <div className="container-x py-9">
              <AnimatePresence mode="wait">
                <motion.div key={open} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.22 }}>
                  {open === "students" && <StudentsPanel years={years} />}
                  {open === "dentists" && <DentistsPanel specialties={specialties} categories={categories} />}
                  {open === "categories" && <CategoriesPanel categories={categories} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StudentsPanel({ years }: { years: Year[] }) {
  return (
    <div className="grid grid-cols-[1fr_15rem] gap-10">
      <div>
        <p className="eyebrow mb-4">Shop by academic year</p>
        <ul className="grid grid-cols-5 gap-3">
          {years.map((y, i) => (
            <li key={y.slug}>
              <Link href={`/students/${y.slug}`} className="group/y relative flex h-44 flex-col justify-between overflow-hidden rounded-[1.25rem] border border-line bg-white p-4 transition-colors duration-300 hover:border-navy hover:bg-navy-deep">
                <span className="flex items-center justify-between font-mono text-[0.7rem] text-muted group-hover/y:text-teal">
                  <span>Y/0{y.number}</span>
                  {y.count > 0 && <span>{y.count} items</span>}
                </span>
                <span className="display text-[4.2rem] leading-none text-navy transition-transform duration-500 group-hover/y:-translate-y-1 group-hover/y:text-white" style={{ transitionDelay: `${i * 20}ms` }}>
                  {y.number}
                </span>
                <span className="text-sm font-medium text-navy-deep group-hover/y:text-white">{y.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col gap-3 border-l border-line pl-8">
        <p className="eyebrow">Students</p>
        <Link href="/students" className="group/l flex items-center justify-between text-lg font-semibold text-navy-deep">
          All student essentials <ArrowUpRight className="size-4 transition-transform group-hover/l:-translate-y-0.5 group-hover/l:translate-x-0.5" />
        </Link>
        <Link href="/bundles" className="text-ink/75 hover:text-navy-deep">Ready-made kits</Link>
        <Link href="/shop?audience=student" className="text-ink/75 hover:text-navy-deep">Shop all student products</Link>
        <p className="mt-auto text-sm leading-relaxed text-muted">Every year comes with its own checklist — tick it off as you shop.</p>
      </div>
    </div>
  );
}

function DentistsPanel({ specialties, categories }: { specialties: Item[]; categories: Item[] }) {
  const pro = categories.filter((c) => ["handpieces", "equipment", "endodontic-supplies", "composites", "burs", "radiology", "polishing", "orthodontic-instruments"].includes(c.slug));
  return (
    <div className="grid grid-cols-[1.1fr_1.4fr_15rem] gap-10">
      <div>
        <p className="eyebrow mb-4">Specialties</p>
        <ul className="grid gap-0.5">
          {specialties.map((s, i) => (
            <li key={s.slug}>
              <Link href={`/dentists/${s.slug}`} className="group/s flex items-baseline gap-3 rounded-lg py-1.5 text-navy-deep">
                <span className="w-6 font-mono text-[0.7rem] text-muted">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-[1.05rem] transition-transform duration-300 group-hover/s:translate-x-1">{s.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="eyebrow mb-4">Professional categories</p>
        <ul className="grid grid-cols-2 gap-2">
          {pro.slice(0, 6).map((c) => (
            <li key={c.slug}>
              <Link href={`/categories/${c.slug}?audience=dentist`} className="group/c flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-aqua">
                <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-[#f3f6f8]">
                  {c.cover && <Image src={c.cover} alt="" fill sizes="56px" className="cutout object-contain p-1.5 transition-transform duration-500 group-hover/c:scale-110" />}
                </span>
                <span className="text-sm font-medium text-navy-deep">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col gap-3 border-l border-line pl-8">
        <p className="eyebrow">Dentists</p>
        <Link href="/dentists" className="group/l flex items-center justify-between text-lg font-semibold text-navy-deep">
          Professional supplies <ArrowUpRight className="size-4 transition-transform group-hover/l:-translate-y-0.5 group-hover/l:translate-x-0.5" />
        </Link>
        <Link href="/shop?audience=dentist" className="text-ink/75 hover:text-navy-deep">Shop all clinic products</Link>
        <Link href="/categories/equipment" className="text-ink/75 hover:text-navy-deep">Equipment</Link>
      </div>
    </div>
  );
}

function CategoriesPanel({ categories }: { categories: Item[] }) {
  return (
    <div>
      <div className="mb-5 flex items-end justify-between">
        <p className="eyebrow">All categories</p>
        <Link href="/shop" className="text-sm font-medium text-navy-deep underline-offset-4 hover:underline">Shop everything →</Link>
      </div>
      <ul className="grid grid-cols-4 gap-x-8 gap-y-1">
        {categories.map((c) => (
          <li key={c.slug}>
            <Link href={`/categories/${c.slug}`} className="group/c flex items-baseline justify-between gap-3 border-b border-line/70 py-2.5 text-navy-deep">
              <span className="transition-transform duration-300 group-hover/c:translate-x-1">{c.name}</span>
              {c.count ? <span className="font-mono text-[0.7rem] text-muted">{c.count}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
