import "server-only";
import { cache } from "react";
import { DEFAULT_LOCALE, getDictionary, type Locale } from ".";

// English-only storefront: the cookie is ignored (kept for a future Arabic edition).
export const getLocale = cache(async (): Promise<Locale> => DEFAULT_LOCALE);

export async function getI18n() {
  const locale = await getLocale();
  return { locale, t: getDictionary(locale) };
}
