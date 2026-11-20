"use client";
import { createContext, useContext } from "react";
import type { Dictionary } from "./dictionaries";
import type { Locale } from ".";

const Ctx = createContext<{ locale: Locale; t: Dictionary } | null>(null);

export function I18nProvider({ locale, t, children }: { locale: Locale; t: Dictionary; children: React.ReactNode }) {
  return <Ctx.Provider value={{ locale, t }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n must be used inside I18nProvider");
  return v;
}
