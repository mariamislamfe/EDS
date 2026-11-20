import { dictionaries, type Dictionary } from "./dictionaries";

export type Locale = "en" | "ar";
export const LOCALES: Locale[] = ["ar", "en"];
export const LOCALE_COOKIE = "eds_locale";
/** The storefront is English-only; Arabic content fields remain as fallbacks. */
export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(v: unknown): v is Locale {
  return v === "en" || v === "ar";
}
export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
export const dirOf = (l: Locale) => (l === "ar" ? "rtl" : "ltr");

/** Replace {placeholders} in a dictionary string. */
export function fmt(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

/** Pick the localized field, falling back to the other language. */
export function pick(locale: Locale, en?: string | null, ar?: string | null): string {
  return (locale === "ar" ? ar || en : en || ar) ?? "";
}

export function formatPrice(value: number | string | null | undefined, locale: Locale) {
  const n = typeof value === "string" ? Number(value) : value ?? 0;
  const s = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-EG", {
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
  return locale === "ar" ? `${s} ج.م` : `EGP ${s}`;
}

export function formatDate(value: string | Date, locale: Locale, withTime = false) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    day: "numeric", month: "short", year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value));
}

export type { Dictionary };
