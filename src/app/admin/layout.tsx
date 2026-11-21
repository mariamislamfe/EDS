import type { Metadata } from "next";
import { fontVariables } from "@/lib/fonts";
import { getDictionary } from "@/lib/i18n";
import { I18nProvider } from "@/lib/i18n/client";
import { isConfigured } from "@/lib/env";
import "@/styles/globals.css";

export const metadata: Metadata = { title: { default: "Dashboard — EDS", template: "%s — EDS Dashboard" }, robots: { index: false, follow: false } };

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={fontVariables}>
      <body className="min-h-dvh bg-cloud">
        <I18nProvider locale="en" t={getDictionary("en")}>
          {isConfigured ? children : (
            <div className="grid min-h-dvh place-items-center p-6 text-center">
              <div><h1 className="text-2xl font-semibold">The store isn&apos;t connected to the database yet</h1><p className="mt-2 text-muted">Set DATABASE_URL in .env.local — see README.</p></div>
            </div>
          )}
        </I18nProvider>
      </body>
    </html>
  );
}
