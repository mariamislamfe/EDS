"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Dictionary } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";

type Item = { slug: string; name: string };

export function MobileMenu({ t, years, specialties, categories }: {
  t: Dictionary; years: Item[]; specialties: Item[]; categories: Item[];
}) {
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<string | null>("students");
  const pathname = usePathname();
  const rtl = locale === "ar";
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- portal target exists only after hydration
  useEffect(() => setMounted(true), []);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => { document.documentElement.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [open]);

  const groupProps = (id: string) => ({ open: section === id, onToggle: () => setSection(section === id ? null : id) });

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="-ms-2 grid size-10 place-items-center rounded-full text-navy lg:hidden" aria-label={t.nav.menu} aria-expanded={open}>
        <Menu className="size-6" />
      </button>
      {/* Portal: the header gets backdrop-blur when scrolled, which would trap this fixed overlay inside it */}
      {mounted && createPortal(<AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[60] lg:hidden">
            <motion.div className="absolute inset-0 bg-navy-deep/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.nav
              aria-label={t.nav.menu}
              initial={{ x: rtl ? "100%" : "-100%" }} animate={{ x: 0 }} exit={{ x: rtl ? "100%" : "-100%" }}
              transition={{ type: "spring", damping: 34, stiffness: 340 }}
              className="absolute inset-y-0 start-0 flex w-[88%] max-w-sm flex-col overflow-y-auto bg-white px-5 pb-8"
            >
              <div className="flex h-16 items-center justify-between">
                <span className="font-display text-xl font-bold text-navy">EDS</span>
                <button type="button" onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-full hover:bg-cloud" aria-label={t.nav.close}>
                  <X className="size-5" />
                </button>
              </div>
              <Group {...groupProps("students")} title={t.nav.students} href="/students" items={years} base="/students" />
              <Group {...groupProps("dentists")} title={t.nav.dentists} href="/dentists" items={specialties} base="/dentists" />
              <Group {...groupProps("categories")} title={t.nav.categories} href="/shop" items={categories} base="/categories" />
              <Link href="/" className="border-b border-line py-4 font-display text-xl font-semibold text-navy">{t.nav.home}</Link>
              <Link href="/bundles" className="border-b border-line py-4 font-display text-xl font-semibold text-navy">{t.nav.bundles}</Link>
              <Link href="/shop" className="border-b border-line py-4 font-display text-xl font-semibold text-navy">{t.nav.shop}</Link>
              <div className="mt-6 flex flex-col gap-1 text-[0.95rem]">
                <Link href="/track" className="py-2">{t.footer.ordersHelp}</Link>
                <Link href="/wishlist" className="py-2">{t.nav.wishlist}</Link>
                <Link href="/about" className="py-2">About EDS</Link>
              </div>
            </motion.nav>
          </div>
        )}
      </AnimatePresence>, document.body)}
    </>
  );
}

function Group({ open, onToggle, title, href, items, base }: {
  open: boolean; onToggle: () => void; title: string; href: string; items: Item[]; base: string;
}) {
  return (
    <div className="border-b border-line">
      <div className="flex items-center">
        <Link href={href} className="flex-1 py-4 font-display text-xl font-semibold text-navy">{title}</Link>
        <button type="button" onClick={onToggle} className="grid size-11 place-items-center" aria-expanded={open} aria-label={title}>
          <ChevronDown className={`size-5 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      {open && (
        <ul className="grid grid-cols-2 gap-x-4 pb-4">
          {items.map((i) => (
            <li key={i.slug}><Link href={`${base}/${i.slug}`} className="block py-2 text-[0.95rem] text-ink">{i.name}</Link></li>
          ))}
        </ul>
      )}
    </div>
  );
}
