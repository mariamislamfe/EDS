"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, GraduationCap, Package, Stethoscope } from "lucide-react";
import type { CatalogBundle } from "@/lib/types";
import { formatPrice, pick } from "@/lib/i18n";
import { AddToCartButton } from "@/components/commerce/AddToCartButton";
import { cn } from "@/lib/utils";

export type PathYear = {
  slug: string; number: number; name: string; tagline: string; count: number;
  products: { slug: string; name: string; image: string; price: number }[];
};
export type PathLink = { href: string; title: string; count: number; image?: string | null };

type Role = "student" | "dentist";
const KEY = "eds_path";

/**
 * "Find your kit": the one decision flow on the home page.
 *   1. Who are you? — student / dentist
 *   2. Student → which year?          Dentist → which specialty?
 *   3. Student → that year's bundles (add to cart right here) + the full list.
 * The choice is remembered, and the hero's buttons jump straight into a path
 * via #for-students / #for-dentists.
 */
export function PathFinder({ years, bundles, specialties, categories }: {
  years: PathYear[]; bundles: CatalogBundle[]; specialties: PathLink[]; categories: PathLink[];
}) {
  const [role, setRole] = useState<Role | null>(null);
  const [year, setYear] = useState<string | null>(null);
  const root = useRef<HTMLElement>(null);
  const stepRef = useRef<HTMLDivElement>(null);

  // restore the last choice + respond to hero links
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as { role?: Role; year?: string } | null;
      if (saved?.role) setRole(saved.role);
      if (saved?.year && years.some((y) => y.slug === saved.year)) setYear(saved.year);
    } catch { /* ignore */ }
    const fromHash = () => {
      const h = window.location.hash;
      if (h === "#for-students") setRole("student");
      else if (h === "#for-dentists") { setRole("dentist"); setYear(null); }
    };
    const fromHero = (e: Event) => {
      const r = (e as CustomEvent<Role>).detail;
      setRole(r);
      if (r === "dentist") setYear(null);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    window.addEventListener("eds:path", fromHero);
    return () => { window.removeEventListener("hashchange", fromHash); window.removeEventListener("eds:path", fromHero); };
  }, [years]);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ role, year })); } catch { /* ignore */ }
  }, [role, year]);

  // keep the newly opened step in view (only if it is below the fold)
  const reveal = () => requestAnimationFrame(() => {
    const el = stepRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top > window.innerHeight * 0.6) el.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  const chooseRole = (r: Role) => { setRole(r); if (r === "dentist") setYear(null); reveal(); };
  const chooseYear = (slug: string) => { setYear(slug); reveal(); };
  const reset = () => { setRole(null); setYear(null); root.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };

  const current = years.find((y) => y.slug === year) ?? null;
  const yearBundles = current ? bundles.filter((b) => b.year_slug === current.slug) : [];
  const step = !role ? 1 : role === "student" && !current ? 2 : 3;
  const steps = role === "dentist" ? ["Who are you?", "Your specialty"] : ["Who are you?", "Your year", "Your kit"];

  return (
    <section
      ref={root}
      id="find-your-kit"
      aria-labelledby="pf-title"
      className="relative z-10 -mt-10 scroll-mt-20 rounded-t-[2.5rem] bg-white shadow-[0_-24px_60px_-30px_rgb(2_42_82/0.35)] sm:-mt-14 sm:rounded-t-[3.5rem] lg:rounded-t-[4.5rem]"
    >
      <span id="for-students" className="absolute top-0" aria-hidden />
      <span id="for-dentists" className="absolute top-0" aria-hidden />
      <div className="mx-auto mt-4 h-1.5 w-14 rounded-full bg-line" aria-hidden />

      <div className="container-x pb-20 pt-10 lg:pb-28 lg:pt-14">
        {/* header + progress */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow mb-3">Find your kit</p>
          <h2 id="pf-title" className="display text-[clamp(2.1rem,5vw,3.6rem)] leading-[0.98]">
            {step === 1 && <>Tell us who you are, <span className="font-serif font-normal italic text-teal-strong">we&apos;ll do the rest.</span></>}
            {step === 2 && <>Which year <span className="font-serif font-normal italic text-teal-strong">are you in?</span></>}
            {step === 3 && role === "student" && current && <>{current.name} <span className="font-serif font-normal italic text-teal-strong">— ready to go.</span></>}
            {step === 3 && role === "dentist" && <>What do you <span className="font-serif font-normal italic text-teal-strong">work on?</span></>}
          </h2>

          <ol className="mt-7 flex items-center justify-center gap-2 text-sm" aria-label="Progress">
            {steps.map((label, i) => {
              const n = i + 1;
              const shown = role === "dentist" && n === 2 ? 3 : n; // dentist skips the year step
              const done = step > shown, active = step === shown;
              return (
                <li key={label} className="flex items-center gap-2">
                  {i > 0 && <span className={cn("h-px w-6 sm:w-10", done || active ? "bg-teal-strong" : "bg-line")} aria-hidden />}
                  <span
                    aria-current={active ? "step" : undefined}
                    className={cn(
                      "flex items-center gap-2 rounded-full px-3 py-1.5 transition-colors",
                      active ? "bg-navy text-white" : done ? "bg-aqua text-navy" : "text-muted",
                    )}
                  >
                    <span className={cn("grid size-5 place-items-center rounded-full text-[0.7rem] font-semibold", active ? "bg-white/20" : done ? "bg-teal-strong text-white" : "border border-line")}>
                      {done ? <Check className="size-3" /> : n}
                    </span>
                    <span className={cn(!active && "max-sm:hidden")}>{label}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        {/* step 1 — role (always visible, compact once chosen) */}
        <div className={cn("mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2", role && "mt-8")}>
          <RoleCard
            active={role === "student"} dim={role === "dentist"} compact={!!role}
            onClick={() => chooseRole("student")}
            icon={<GraduationCap className="size-7" strokeWidth={1.6} />}
            title="I'm a student" text="Pick your year and get the exact list your faculty asks for — bundled and ready."
          />
          <RoleCard
            active={role === "dentist"} dim={role === "student"} compact={!!role}
            onClick={() => chooseRole("dentist")}
            icon={<Stethoscope className="size-7" strokeWidth={1.6} />}
            title="I'm a dentist" text="Handpieces, burs, endo, composites and equipment — sorted by the work you do."
          />
        </div>

        <div ref={stepRef} className="scroll-mt-24">
          {/* step 2 — year */}
          {role === "student" && (
            <div className="mx-auto mt-10 max-w-5xl animate-rise">
              <p className="mb-4 text-center text-sm text-muted">{current ? "Change year" : "Choose your academic year"}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {years.map((y) => {
                  const on = y.slug === year;
                  return (
                    <button
                      key={y.slug} type="button" onClick={() => chooseYear(y.slug)} aria-pressed={on}
                      className={cn(
                        "group flex flex-col items-start gap-1 rounded-2xl border p-4 text-start transition-all duration-300",
                        on ? "border-navy bg-navy text-white shadow-lg shadow-navy/20" : "border-line bg-white hover:-translate-y-0.5 hover:border-navy/40 hover:bg-aqua",
                      )}
                    >
                      <span className={cn("font-mono text-xs", on ? "text-teal" : "text-teal-strong")}>Year {y.number}</span>
                      <span className={cn("display text-xl leading-tight", on && "!text-white")}>{y.name}</span>
                      <span className={cn("text-xs", on ? "text-white/60" : "text-muted")}>{y.count} products</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* step 3 — student: the year's bundles */}
          {role === "student" && current && (
            <div key={current.slug} className="mx-auto mt-12 max-w-6xl animate-rise">
              {yearBundles.length > 0 ? (
                <>
                  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h3 className="display text-2xl">Bundles for {current.name}</h3>
                      <p className="text-sm text-muted">Everything in one box — usually cheaper than buying piece by piece.</p>
                    </div>
                  </div>
                  <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {yearBundles.map((b) => <li key={b.id}><BundleTile b={b} /></li>)}
                  </ul>
                </>
              ) : (
                <div className="rounded-3xl bg-aqua p-6 sm:p-8">
                  <h3 className="display text-2xl">The {current.name} list</h3>
                  <p className="mt-1 text-sm text-muted">Bundles for this year are on the way — meanwhile, here is what&apos;s on the list.</p>
                  {current.products.length > 0 && (
                    <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {current.products.slice(0, 4).map((p) => (
                        <li key={p.slug}>
                          <Link href={`/products/${p.slug}`} className="group block rounded-2xl bg-white p-3">
                            <span className="relative block aspect-square">
                              <Image src={p.image} alt="" fill sizes="(min-width:640px) 20vw, 45vw" className="object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105" />
                            </span>
                            <span className="mt-2 line-clamp-2 text-sm text-ink">{p.name}</span>
                            <span className="text-sm font-semibold text-navy">{formatPrice(p.price, "en")}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link href={`/students/${current.slug}`} className="btn btn-primary btn-lg">
                  See the full {current.name} list <ArrowRight className="size-4" />
                </Link>
                <button type="button" onClick={reset} className="btn btn-ghost btn-lg">
                  <ArrowLeft className="size-4" /> Start over
                </button>
              </div>
            </div>
          )}

          {/* step 2/3 — dentist: specialties + quick categories */}
          {role === "dentist" && (
            <div className="mx-auto mt-10 max-w-6xl animate-rise">
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {specialties.map((s) => (
                  <li key={s.href}>
                    <Link href={s.href} className="group flex h-full items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-navy hover:bg-navy hover:text-white">
                      <span>
                        <span className="block font-display text-lg font-semibold leading-tight text-navy-deep group-hover:text-white">{s.title}</span>
                        {s.count > 0 && <span className="text-xs text-muted group-hover:text-white/60">{s.count} products</span>}
                      </span>
                      <ArrowUpRight className="size-4 shrink-0 text-muted transition-transform group-hover:rotate-45 group-hover:text-teal" />
                    </Link>
                  </li>
                ))}
              </ul>

              {categories.length > 0 && (
                <>
                  <p className="mb-3 mt-10 text-center text-sm text-muted">Or jump straight to</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {categories.map((c) => (
                      <Link key={c.href} href={c.href} className="rounded-full border border-line px-4 py-2 text-sm text-navy transition-colors hover:border-navy hover:bg-aqua">
                        {c.title}
                      </Link>
                    ))}
                  </div>
                </>
              )}

              <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link href="/dentists" className="btn btn-primary btn-lg">
                  Shop all professional supplies <ArrowRight className="size-4" />
                </Link>
                <button type="button" onClick={reset} className="btn btn-ghost btn-lg">
                  <ArrowLeft className="size-4" /> Start over
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function RoleCard({ active, dim, compact, onClick, icon, title, text }: {
  active: boolean; dim: boolean; compact: boolean; onClick: () => void; icon: React.ReactNode; title: string; text: string;
}) {
  return (
    <button
      type="button" onClick={onClick} aria-pressed={active}
      className={cn(
        "group relative flex items-center gap-5 overflow-hidden rounded-3xl border-2 text-start transition-all duration-300",
        compact ? "p-4 sm:p-5" : "p-6 sm:p-8 sm:flex-col sm:items-start",
        active ? "border-navy bg-navy text-white shadow-xl shadow-navy/20"
          : "border-line bg-aqua/60 hover:-translate-y-1 hover:border-navy/50 hover:bg-aqua",
        dim && "opacity-60 hover:opacity-100",
      )}
    >
      <span className={cn("grid shrink-0 place-items-center rounded-2xl transition-colors", compact ? "size-12" : "size-14 sm:size-16",
        active ? "bg-white/15 text-teal" : "bg-white text-navy")}>{icon}</span>
      <span className="flex-1">
        <span className={cn("display block leading-tight", compact ? "text-xl" : "text-2xl sm:text-3xl", active && "!text-white")}>{title}</span>
        {!compact && <span className="mt-2 block text-sm leading-relaxed text-muted">{text}</span>}
      </span>
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-full transition-all sm:absolute sm:end-5 sm:top-5",
        active ? "bg-teal text-navy-deep" : "bg-white text-navy group-hover:bg-navy group-hover:text-white")}>
        {active ? <Check className="size-4" /> : <ArrowRight className="size-4" />}
      </span>
    </button>
  );
}

function BundleTile({ b }: { b: CatalogBundle }) {
  const name = pick("en", b.name_en, b.name_ar);
  const price = b.effective_price;
  const compare = b.compare_at_price ?? (b.items_value > price ? b.items_value : null);
  const saving = compare && compare > price ? compare - price : 0;
  const href = `/bundles/${encodeURIComponent(b.slug)}`;
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-white transition-shadow hover:shadow-xl hover:shadow-navy/10">
      <Link href={href} className="relative block aspect-[4/3] bg-cloud">
        {b.image_url
          ? <Image src={b.image_url} alt={name} fill sizes="(min-width:1024px) 30vw, (min-width:768px) 45vw, 100vw" className="object-contain p-6" />
          : <span className="absolute inset-0 grid place-items-center text-teal"><Package className="size-14" strokeWidth={1.2} /></span>}
        {saving > 0 && (
          <span className="absolute start-4 top-4 rounded-full bg-teal px-3 py-1 text-xs font-semibold text-navy-deep">
            Save {formatPrice(saving, "en")}
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h4 className="text-lg font-semibold leading-tight text-navy-deep"><Link href={href} className="hover:underline">{name}</Link></h4>
        <p className="text-sm text-muted">{b.item_count} items in the box</p>
        <div className="mt-auto flex items-baseline gap-2 pt-3">
          <span className="font-display text-2xl font-semibold tabular-nums text-navy">{formatPrice(price, "en")}</span>
          {compare && compare > price && <s className="text-sm tabular-nums text-muted">{formatPrice(compare, "en")}</s>}
        </div>
        <div className="flex gap-2 pt-2">
          <AddToCartButton
            compact className="flex-1" disabled={!b.in_stock}
            label={b.in_stock ? "Add bundle to cart" : "Out of stock"}
            line={{ type: "bundle", id: b.id, variantId: null, snapshot: { slug: b.slug, name_en: b.name_en, name_ar: b.name_ar, image: b.image_url, price } }}
          />
          <Link href={href} className="btn btn-ghost btn-sm">What&apos;s inside</Link>
        </div>
      </div>
    </article>
  );
}
