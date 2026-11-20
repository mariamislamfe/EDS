import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <div className="container-x py-24">
      <div className="mx-auto max-w-xl text-center">
        <p className="font-display text-[7rem] font-extrabold leading-none tracking-[-0.06em] text-teal">404</p>
        <h1 className="mt-4 text-3xl font-bold">{t.errors.notFoundTitle}</h1>
        <p className="mt-3 text-muted">{t.errors.notFoundText}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Link href="/" className="btn btn-primary">{t.nav.home}</Link>
          <Link href="/shop" className="btn btn-ghost">{t.nav.shop}</Link>
        </div>
      </div>
    </div>
  );
}
