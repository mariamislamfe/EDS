import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { getI18n } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/client";
import { SITE_URL, isConfigured } from "@/lib/env";
import { fontVariables } from "@/lib/fonts";
import { getSettings } from "@/lib/catalog";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { RevealObserver } from "@/components/layout/RevealObserver";
import { CartDrawer } from "@/components/commerce/CartDrawer";
import { QuickViewHost } from "@/components/commerce/QuickViewHost";
import { SetupNotice } from "@/components/ui/SetupNotice";
import { MotionLayer } from "@/components/fx/MotionLayer";
import { CinematicHost } from "@/components/fx/Cinematic";
import { AssistantLauncher } from "@/components/assistant/Assistant";
import { MetaPixel } from "@/components/analytics/MetaPixel";
import "@/styles/globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: "EDS — Precision Starts Here | Al Esraa Dental Store", template: `%s — EDS` },
    description: t.meta.description,
    openGraph: { siteName: "EDS — Al Esraa Dental Store", locale: "en_EG", type: "website", images: ["/brand/eds-logo-full.png"] },
  };
}

export const viewport: Viewport = { themeColor: "#ffffff", width: "device-width", initialScale: 1 };

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const { locale, t } = await getI18n();
  const pixelIds = isConfigured ? (await getSettings().catch(() => null))?.metaPixel?.ids ?? [] : [];
  return (
    <html lang="en" dir="ltr" className={fontVariables} suppressHydrationWarning>
      <head>
        {/* gates the reveal-on-scroll hidden state so content is never hidden without JS */}
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body className="min-h-dvh">
        <I18nProvider locale={locale} t={t}>
          <Header />
          <main id="main" className="min-h-[60vh]">
            {isConfigured ? children : <SetupNotice />}
          </main>
          <Footer />
          <CartDrawer />
          <QuickViewHost />
          <RevealObserver />
          <MotionLayer />
          <CinematicHost />
          {isConfigured && <AssistantLauncher />}
          {pixelIds.length > 0 && (
            <Suspense fallback={null}>
              <MetaPixel ids={pixelIds} />
            </Suspense>
          )}
        </I18nProvider>
      </body>
    </html>
  );
}
