"use client";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type Station = { key: string; title: string; text: string; href: string; count: number; x: number; y: number };

/**
 * A clinic floor plan, drawn like a blueprint. Each station is a hotspot that
 * leads to the matching category; the list beside it stays in sync on hover.
 */
export function ClinicPlan({ stations }: { stations: Station[] }) {
  const [hot, setHot] = useState<string | null>(null);
  return (
    <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:items-center">
      <div className="relative aspect-[10/7] overflow-hidden rounded-[2rem] border border-teal/25 bg-[#03244a]" data-rise>
        <div aria-hidden className="mm-grid-dark absolute inset-0 opacity-80" />
        <svg viewBox="0 0 1000 700" className="absolute inset-0 size-full" aria-hidden>
          <g fill="none" stroke="#65c2c7" strokeOpacity="0.55" strokeWidth="2.5">
            {/* walls & door */}
            <path d="M60 60 H940 V640 H600 M480 640 H60 Z" />
            <path d="M600 640 A120 120 0 0 0 480 520" strokeDasharray="6 8" />
            {/* cabinets along the top wall */}
            <rect x="90" y="80" width="420" height="80" rx="8" />
            <path d="M195 80 V160 M300 80 V160 M405 80 V160" strokeOpacity="0.3" />
            {/* sink / sterilisation corner */}
            <rect x="760" y="80" width="160" height="150" rx="10" />
            <circle cx="840" cy="155" r="38" />
            {/* dental chair (top view) */}
            <path d="M430 300 q70 -40 140 0 l20 170 q-90 50 -180 0 Z" />
            <ellipse cx="500" cy="262" rx="58" ry="34" />
            <path d="M440 470 q60 70 120 0" />
            {/* light arm */}
            <path d="M500 262 L640 200 L700 230" strokeDasharray="4 6" />
            <circle cx="700" cy="230" r="22" />
            {/* operator stool + cart */}
            <circle cx="320" cy="380" r="34" />
            <rect x="260" y="470" width="140" height="80" rx="10" />
            {/* x-ray on the wall */}
            <rect x="890" y="330" width="40" height="120" rx="6" />
            <path d="M890 390 L800 390" strokeDasharray="4 6" />
          </g>
          <text x="80" y="690" fill="#65c2c7" fillOpacity="0.55" fontSize="16" fontFamily="var(--font-jetbrains), monospace">PLAN — TREATMENT ROOM 01 · SCALE 1:50</text>
        </svg>
        {stations.map((s, i) => (
          <Link
            key={s.key} href={s.href}
            onMouseEnter={() => setHot(s.key)} onMouseLeave={() => setHot(null)} onFocus={() => setHot(s.key)} onBlur={() => setHot(null)}
            className="group absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${s.x}%`, top: `${s.y}%` }}
            aria-label={s.title}
          >
            <span className="pin-pulse absolute inset-0 rounded-full bg-teal/50" style={{ animationDelay: `${i * 300}ms` }} />
            <span className={cn("relative grid size-9 place-items-center rounded-full border-2 border-white font-mono text-xs font-semibold transition-[transform,background-color] duration-300 sm:size-10",
              hot === s.key ? "scale-125 bg-white text-navy-deep" : "bg-teal text-navy-deep")}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className={cn("pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-3 py-1 text-xs font-medium text-navy-deep shadow-lg transition-[opacity,transform] duration-300",
              hot === s.key ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0")}>
              {s.title}
            </span>
          </Link>
        ))}
      </div>

      <ol className="border-t border-white/10" data-stagger>
        {stations.map((s, i) => (
          <li key={s.key} className="border-b border-white/10">
            <Link href={s.href} onMouseEnter={() => setHot(s.key)} onMouseLeave={() => setHot(null)}
              className="group/s flex items-start gap-4 py-4">
              <span className={cn("mt-1 w-7 font-mono text-xs transition-colors", hot === s.key ? "text-teal" : "text-white/40")}>{String(i + 1).padStart(2, "0")}</span>
              <span className="flex-1">
                <span className={cn("display block text-xl leading-tight transition-[transform,color] duration-500 ease-[var(--ease-out-soft)]", hot === s.key ? "translate-x-2 text-teal" : "text-white")}>{s.title}</span>
                <span className="mt-1 block text-sm text-white/55">{s.text}</span>
              </span>
              {s.count > 0 && <span className="mt-1 font-mono text-xs text-white/40">{s.count}</span>}
              <ArrowUpRight className={cn("mt-1 size-4 transition-all duration-500", hot === s.key ? "rotate-45 text-teal" : "text-white/30")} />
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
