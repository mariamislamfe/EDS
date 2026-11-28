import Link from "next/link";
import { cn } from "@/lib/utils";

/** Section heading row: title, optional supporting line, optional "see all" link. */
export function SectionHead({
  title, text, href, linkLabel, className, as: Tag = "h2",
}: {
  title: string;
  text?: string;
  href?: string;
  linkLabel?: string;
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn("mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-3", className)}>
      <div className="max-w-2xl">
        <Tag className="text-[clamp(1.3rem,2.2vw,1.8rem)] font-semibold leading-[1.1] tracking-[-0.02em]">{title}</Tag>
        {text && <p className="mt-2.5 text-muted">{text}</p>}
      </div>
      {href && linkLabel && (
        <Link href={href} className="group inline-flex items-center gap-1.5 text-sm font-medium text-navy">
          <span className="border-b border-navy/30 pb-0.5 transition-colors group-hover:border-navy">{linkLabel}</span>
        </Link>
      )}
    </div>
  );
}

export function EmptyState({ title, text, children }: { title: string; text?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-line px-6 py-16 text-center">
      <p className="font-display text-xl font-semibold text-navy">{title}</p>
      {text && <p className="max-w-md text-muted">{text}</p>}
      {children && <div className="mt-3 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden className="text-line">/</span>}
            {it.href ? <Link href={it.href} className="hover:text-navy">{it.label}</Link> : <span aria-current="page" className="text-ink">{it.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
