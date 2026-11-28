import Image from "next/image";
import Link from "next/link";
import { getSettings, getYears } from "@/lib/catalog";
import { getI18n } from "@/lib/i18n/server";
import { pick } from "@/lib/i18n";

export async function Footer() {
  const { locale, t } = await getI18n();
  const [settings, years] = await Promise.all([
    getSettings().catch(() => null),
    getYears().catch(() => []),
  ]);
  const s = settings?.store;
  const contact = [
    s?.phone && { label: s.phone, href: `tel:${s.phone.replace(/\s/g, "")}` },
    s?.whatsapp && { label: `WhatsApp ${s.whatsapp}`, href: `https://wa.me/${s.whatsapp.replace(/\D/g, "")}` },
    s?.email && { label: s.email, href: `mailto:${s.email}` },
    s?.instagram && { label: "Instagram", href: s.instagram },
    s?.facebook && { label: "Facebook", href: s.facebook },
  ].filter(Boolean) as { label: string; href: string }[];
  const address = s ? pick(locale, s.address_en, s.address_ar) : "";
  const hours = s ? pick(locale, s.working_hours_en, s.working_hours_ar) : "";

  return (
    <footer className="on-dark relative mt-24 overflow-hidden bg-navy-deep text-white/80">
      <div aria-hidden className="mm-grid-dark absolute inset-0 opacity-60" />
      <div className="container-x relative flex flex-col gap-8 border-b border-white/10 pb-14 pt-20 lg:flex-row lg:items-end lg:justify-between">
        <p className="display max-w-3xl text-[clamp(2.4rem,5.4vw,5rem)] leading-[0.92] text-white">
          Precision starts <span className="font-serif font-normal italic text-teal">here.</span>
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/students" className="btn btn-light btn-lg" data-magnetic>Student essentials</Link>
          <Link href="/dentists" className="btn btn-outline-light btn-lg" data-magnetic>Professional supplies</Link>
        </div>
      </div>
      <div className="container-x relative grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Image src="/brand/eds-mark.png" alt="" width={48} height={48} />
            <div>
              <p className="font-display text-2xl font-bold text-white">EDS</p>
              <p className="text-sm text-white/60">{pick(locale, s?.name_en ?? "Al Esraa Dental Store", s?.name_ar ?? "الإسراء لأجهزة ومستلزمات طب الأسنان")}</p>
            </div>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-white/60">{t.footer.tagline}</p>
        </div>

        <nav aria-label={t.nav.students}>
          <p className="mb-4 font-display font-semibold text-white">{t.nav.students}</p>
          <ul className="flex flex-col gap-2.5 text-sm">
            {years.map((y) => (
              <li key={y.id}><Link className="hover:text-teal" href={`/students/${y.slug}`}>{pick(locale, y.name_en, y.name_ar)}</Link></li>
            ))}
            <li><Link className="hover:text-teal" href="/bundles">{t.nav.bundles}</Link></li>
          </ul>
        </nav>

        <nav aria-label={t.footer.shop}>
          <p className="mb-4 font-display font-semibold text-white">{t.footer.shop}</p>
          <ul className="flex flex-col gap-2.5 text-sm">
            <li><Link className="hover:text-teal" href="/dentists">{t.nav.dentists}</Link></li>
            <li><Link className="hover:text-teal" href="/shop">{t.nav.shop}</Link></li>
            <li><Link className="hover:text-teal" href="/shop?sort=newest">{t.home.newTitle}</Link></li>
            <li><Link className="hover:text-teal" href="/wishlist">{t.nav.wishlist}</Link></li>
            <li><Link className="hover:text-teal" href="/track">{t.footer.ordersHelp}</Link></li>
            <li><Link className="hover:text-teal" href="/about">About EDS</Link></li>
          </ul>
        </nav>

        <div>
          <p className="mb-4 font-display font-semibold text-white">{t.footer.contact}</p>
          {contact.length || address || hours ? (
            <ul className="flex flex-col gap-2.5 text-sm">
              {contact.map((c) => (
                <li key={c.href}><a className="hover:text-teal" href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" dir="ltr">{c.label}</a></li>
              ))}
              {address && <li className="text-white/60">{address}</li>}
              {hours && <li className="text-white/60">{hours}</li>}
            </ul>
          ) : (
            <p className="text-sm text-white/50">{t.home.contactText}</p>
          )}
        </div>
      </div>

      <p aria-hidden className="display pointer-events-none relative select-none whitespace-nowrap text-center text-[26vw] leading-[0.72] tracking-[-0.07em] text-white/[0.04]">EDS</p>
      <div className="relative border-t border-white/10">
        {/* bottom-left, clear of the floating "Check my list" button (bottom-right) */}
        <div className="container-x flex flex-col items-center gap-1.5 pb-24 pt-5 text-xs text-white/50 sm:flex-row sm:gap-3 sm:pb-6 sm:pe-56">
          <p>© {new Date().getFullYear()} Al Esraa Dental Store. {t.footer.rights}</p>
          <span aria-hidden className="hidden text-white/20 sm:inline">·</span>
          <p dir="ltr">
            Made by{" "}
            <a href="https://www.instagram.com/websity.eg/" target="_blank" rel="noopener noreferrer" className="text-white/70 underline-offset-4 hover:text-teal hover:underline">
              Websity
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
