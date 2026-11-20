export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function discountPercent(price: number, compare: number | null | undefined) {
  if (!compare || compare <= price) return 0;
  return Math.round((1 - price / compare) * 100);
}

export function variantLabel(options: Record<string, string>) {
  return Object.values(options).join(" / ");
}

/** Build a URL with updated search params (removing empty values and resetting page). */
export function withParams(path: string, current: Record<string, string | undefined>, patch: Record<string, string | null | undefined>) {
  const p = new URLSearchParams();
  Object.entries({ ...current, page: undefined, ...patch }).forEach(([k, v]) => {
    if (v != null && v !== "") p.set(k, String(v));
  });
  const s = p.toString();
  return s ? `${path}?${s}` : path;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9؀-ۿ]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}
