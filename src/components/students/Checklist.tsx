"use client";
import Link from "next/link";
import { Check } from "lucide-react";
import { fmt } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { checklist, useChecklist } from "@/lib/store";
import { cn } from "@/lib/utils";

export function Checklist({ items }: { items: { id: string; label: string; href: string | null }[] }) {
  const { t } = useI18n();
  const state = useChecklist();
  const done = items.filter((i) => state[i.id]).length;
  return (
    <div className="rounded-[1.75rem] border border-line p-6 sm:p-8">
      <div className="mb-5 flex items-center gap-4">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-cloud">
          <div className="h-full rounded-full bg-teal transition-[width] duration-500" style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }} />
        </div>
        <span className="text-sm tabular-nums text-muted">{fmt(t.students.checklistProgress, { done, total: items.length })}</span>
      </div>
      <ul className="grid gap-x-8 sm:grid-cols-2">
        {items.map((i) => (
          <li key={i.id} className="flex items-center gap-3 border-b border-line py-3">
            <button type="button" role="checkbox" aria-checked={!!state[i.id]} onClick={() => checklist.toggle(i.id)}
              className={cn("grid size-6 shrink-0 place-items-center rounded-md border transition-colors", state[i.id] ? "border-navy bg-navy text-white" : "border-line")}
              aria-label={i.label}>
              {state[i.id] && <Check className="size-4" />}
            </button>
            <span className={cn("flex-1", state[i.id] && "text-muted line-through")}>{i.label}</span>
            {i.href && <Link href={i.href} className="text-sm font-medium text-teal-strong hover:underline">{t.common.viewDetails}</Link>}
          </li>
        ))}
      </ul>
    </div>
  );
}
