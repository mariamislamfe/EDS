"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgePercent, Boxes, ExternalLink, GraduationCap, LayoutDashboard, Layers, Menu, Package, PanelsTopLeft,
  LogOut, Settings, ShoppingCart, Stethoscope, Tag, X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { adminLogout } from "@/lib/admin/session-actions";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/bundles", label: "Bundles", icon: Boxes },
  { href: "/admin/years", label: "Academic years", icon: GraduationCap },
  { href: "/admin/categories", label: "Categories", icon: Layers },
  { href: "/admin/specialties", label: "Specialties", icon: Stethoscope },
  { href: "/admin/brands", label: "Brands", icon: Tag },
  { href: "/admin/promotions", label: "Promotions", icon: BadgePercent },
  { href: "/admin/content", label: "Website content", icon: PanelsTopLeft },
  { href: "/admin/settings", label: "Store settings", icon: Settings },
];

export function AdminNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const links = (
    <nav className="flex flex-col gap-0.5" aria-label="Dashboard">
      {NAV.map((n) => {
        const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
        return (
          <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined}
            className={cn("flex h-10 items-center gap-3 rounded-xl px-3 text-[0.92rem] transition-colors",
              active ? "bg-navy text-white" : "text-ink hover:bg-white")}>
            <n.icon className="size-[18px]" strokeWidth={1.8} />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-white px-4 lg:hidden">
        <Link href="/admin" className="flex items-center gap-2 font-display font-bold text-navy">
          <Image src="/brand/eds-mark.png" alt="" width={28} height={28} /> EDS Dashboard
        </Link>
        <button onClick={() => setOpen(true)} className="grid size-10 place-items-center" aria-label="Open menu"><Menu className="size-5" /></button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy-deep/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-cloud p-4">
            <button onClick={() => setOpen(false)} className="mb-4 ms-auto grid size-10 place-items-center" aria-label="Close menu"><X className="size-5" /></button>
            {links}
            <form action={adminLogout} className="mt-4 border-t border-line pt-4"><button className="flex items-center gap-2 px-3 text-sm text-muted hover:text-navy"><LogOut className="size-4" /> Sign out</button></form>
          </div>
        </div>
      )}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 overflow-y-auto border-e border-line bg-cloud p-4 lg:flex">
        <Link href="/admin" className="flex items-center gap-2.5 px-2 pt-2">
          <Image src="/brand/eds-mark.png" alt="" width={34} height={34} />
          <span className="leading-tight"><span className="block font-display font-bold text-navy">EDS</span><span className="text-xs text-muted">Dashboard</span></span>
        </Link>
        {links}
        <div className="mt-auto flex flex-col gap-2 border-t border-line pt-4 text-sm">
          <Link href="/" target="_blank" className="flex items-center gap-2 px-3 text-muted hover:text-navy"><ExternalLink className="size-4" /> View store</Link>
          <form action={adminLogout}><button className="flex items-center gap-2 px-3 text-muted hover:text-navy"><LogOut className="size-4" /> Sign out</button></form>
        </div>
      </aside>
    </>
  );
}
