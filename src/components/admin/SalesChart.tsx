"use client";
import { useState } from "react";
import { formatPrice } from "@/lib/i18n";

/** 30-day revenue bars (inline SVG, no chart library). */
export function SalesChart({ data }: { data: { day: string; total: number; orders: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!data.length) return <p className="text-sm text-muted">No data yet.</p>;
  const max = Math.max(...data.map((d) => Number(d.total)), 1);
  const W = 600, H = 180, gap = 4;
  const bw = (W - gap * (data.length - 1)) / data.length;
  const active = hover != null ? data[hover] : null;
  const total = data.reduce((n, d) => n + Number(d.total), 0);
  const orders = data.reduce((n, d) => n + Number(d.orders), 0);
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <p><span className="font-display text-xl font-semibold tabular-nums text-navy">{formatPrice(total, "en")}</span> <span className="text-muted">from {orders} orders</span></p>
        <p className="tabular-nums text-muted" aria-live="polite">
          {active ? `${new Date(active.day).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}: ${formatPrice(Number(active.total), "en")} · ${active.orders} orders` : "Hover a day for details"}
        </p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-44 w-full" role="img" aria-label="Daily revenue for the last 30 days" onMouseLeave={() => setHover(null)}>
        <line x1="0" x2={W} y1={H - 0.5} y2={H - 0.5} stroke="var(--color-line)" />
        {data.map((d, i) => {
          const h = Math.max((Number(d.total) / max) * (H - 8), Number(d.total) > 0 ? 3 : 1);
          return (
            <rect key={d.day} x={i * (bw + gap)} y={H - h} width={bw} height={h} rx={3}
              fill={hover === i ? "var(--color-navy)" : Number(d.total) > 0 ? "var(--color-teal)" : "var(--color-line)"}
              onMouseEnter={() => setHover(i)}>
              <title>{`${d.day}: ${d.total}`}</title>
            </rect>
          );
        })}
      </svg>
    </div>
  );
}
