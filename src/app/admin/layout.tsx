import type { Metadata } from "next";
import { fontVariables } from "@/lib/fonts";
import { getDictionary } from "@/lib/i18n";
import { I18nProvider } from "@/lib/i18n/client";
import { isConfigured } from "@/lib/env";
import { requireStaffPage } from "@/lib/admin/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { ToastProvider } from "@/components/admin/ui";
import "@/styles/globals.css";

export const metadata: Metadata = { title: { default: "Dashboard — EDS", template: "%s — EDS Dashboard" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={fontVariables}>
      <body className="min-h-dvh bg-cloud">
        <I18nProvider locale="en" t={getDictionary("en")}>
          {isConfigured ? <Shell>{children}</Shell> : (
            <div className="grid min-h-dvh place-items-center p-6 text-center">
              <div><h1 className="text-2xl font-semibold">The store isn&apos;t connected to Neon yet</h1><p className="mt-2 text-muted">Set DATABASE_URL and the Neon Auth variables in .env.local — see README.</p></div>
            </div>
          )}
        </I18nProvider>
      </body>
    </html>
  );
}

async function Shell({ children }: { children: React.ReactNode }) {
  const staff = await requireStaffPage();
  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[16rem_1fr]">
      <AdminNav name={staff.name} role={staff.role} />
      <main className="min-w-0 px-4 pb-16 pt-6 sm:px-6 lg:px-10 lg:pt-10"><ToastProvider>{children}</ToastProvider></main>
    </div>
  );
}
