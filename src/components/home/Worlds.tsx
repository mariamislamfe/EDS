import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { WorldLink } from "@/components/fx/Cinematic";

type Img = string | null;

/**
 * Two doors: Students and Dentists. The hovered door widens; entering either
 * plays the world's title card (see <CinematicHost>). Clinic setup sits below.
 */
export function Worlds({ studentImage, dentistImage, years, specialties, clinicCount }: {
  studentImage: Img; dentistImage: Img;
  years: { number: number; name: string }[];
  specialties: string[];
  clinicCount: number;
}) {
  return (
    <section id="worlds" className="container-x scroll-mt-20 py-10 sm:py-14" aria-labelledby="worlds-title">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h2 id="worlds-title" className="display text-[clamp(1.9rem,3.6vw,3rem)] leading-[0.95]" data-split>
          <span className="w inline-block overflow-hidden align-bottom"><span className="inline-block">Choose</span></span>{" "}
          <span className="w inline-block overflow-hidden align-bottom"><span className="inline-block">your</span></span>{" "}
          <span className="w inline-block overflow-hidden align-bottom"><span className="inline-block font-serif font-normal italic text-teal-strong">world.</span></span>
        </h2>
        <p className="max-w-sm text-muted" data-rise>Two stores in one — each built around how you actually work. Step in.</p>
      </div>

      <div className="flex flex-col gap-3 lg:h-[22rem] lg:flex-row" data-stagger>
        {/* students */}
        <WorldLink world="students" href="/students"
          className="group relative flex min-h-[15rem] flex-col justify-between overflow-hidden rounded-[1.75rem] bg-aqua p-5 transition-[flex-grow] duration-700 ease-[var(--ease-out-soft)] sm:min-h-[18rem] sm:p-8 lg:flex-1 lg:hover:flex-[1.45]">
          <div aria-hidden className="mm-grid absolute inset-0 opacity-70" />
          {studentImage && (
            <Image src={studentImage} alt="" fill sizes="(min-width:1024px) 50vw, 100vw"
              className="object-cover opacity-90 transition-transform duration-[1.2s] ease-[var(--ease-out-soft)] group-hover:scale-[1.04]" />
          )}
          {studentImage && <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgb(238_247_247/0.92),rgb(238_247_247/0.15)_60%,rgb(238_247_247/0.85))]" />}
          <div className="relative flex items-start justify-between">
            <span className="eyebrow">Journey 01 — Dental students</span>
            <span className="grid size-12 place-items-center rounded-full bg-navy text-white transition-transform duration-500 group-hover:rotate-45"><ArrowUpRight className="size-5" /></span>
          </div>
          <div className="relative">
            <p className="display text-[clamp(2.6rem,5.4vw,4.6rem)] leading-[0.9] tracking-[-0.06em]">Students<span className="font-serif font-normal italic text-teal-strong">.</span></p>
            <p className="mt-2 max-w-sm text-sm text-muted sm:text-base">Pick your year, then your subject — every tool on your list, with ready-made kits.</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {years.map((y) => (
                <li key={y.number} className="grid size-11 place-items-center rounded-full border border-navy/15 bg-white/70 font-mono text-sm text-navy transition-colors duration-300 group-hover:border-navy/30">
                  0{y.number}
                </li>
              ))}
            </ul>
          </div>
        </WorldLink>

        {/* dentists */}
        <WorldLink world="dentists" href="/dentists"
          className="on-dark group relative flex min-h-[15rem] flex-col justify-between overflow-hidden rounded-[1.75rem] bg-navy-deep p-5 text-white sm:min-h-[18rem] sm:p-8 transition-[flex-grow] duration-700 ease-[var(--ease-out-soft)] lg:flex-1 lg:hover:flex-[1.45]">
          <div aria-hidden className="mm-grid-dark absolute inset-0" />
          {dentistImage && (
            <Image src={dentistImage} alt="" fill sizes="(min-width:1024px) 50vw, 100vw"
              className="object-cover opacity-45 transition-transform duration-[1.2s] ease-[var(--ease-out-soft)] group-hover:scale-[1.04]" />
          )}
          <div aria-hidden className="absolute -right-24 -top-24 size-96 rounded-full bg-[radial-gradient(circle,rgb(101_194_199/0.3),transparent_65%)] transition-transform duration-700 group-hover:scale-125" />
          <div className="relative flex items-start justify-between">
            <span className="eyebrow">Journey 02 — Dentists & clinics</span>
            <span className="grid size-12 place-items-center rounded-full bg-teal text-navy-deep transition-transform duration-500 group-hover:rotate-45"><ArrowUpRight className="size-5" /></span>
          </div>
          <div className="relative">
            <p className="display text-[clamp(2.6rem,5.4vw,4.6rem)] leading-[0.9] tracking-[-0.06em]"><span className="font-serif font-normal italic text-teal">D</span>entists</p>
            <p className="mt-2 max-w-sm text-sm text-white/65 sm:text-base">Handpieces, endo, composites and equipment — organised by the work you do.</p>
            <p className="mt-4 line-clamp-2 max-w-md font-mono text-xs uppercase leading-6 tracking-[0.14em] text-white/45">{specialties.join(" · ")}</p>
          </div>
        </WorldLink>
      </div>

      <WorldLink world="clinic" href="/clinic-setup"
        className="group relative mt-3 flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-[1.75rem] border border-line bg-white px-5 py-4 sm:px-8 sm:py-5 transition-colors duration-500 hover:border-navy hover:bg-navy-deep " data-rise>
        <span className="flex items-center gap-5">
          <span className="font-mono text-xs uppercase tracking-[0.16em] text-teal-strong transition-colors group-hover:text-teal">New</span>
          <span className="display text-[clamp(1.5rem,3vw,2.4rem)] leading-none transition-colors group-hover:text-white">
            Setting up a clinic? <span className="font-serif font-normal italic text-teal-strong group-hover:text-teal">Start here.</span>
          </span>
        </span>
        <span className="flex items-center gap-3 text-sm text-muted transition-colors group-hover:text-white/70">
          {clinicCount > 0 ? `${clinicCount} ready packages` : "Chair to bur, room by room"}
          <ArrowUpRight className="size-5 transition-transform duration-500 group-hover:rotate-45" />
        </span>
      </WorldLink>
    </section>
  );
}
