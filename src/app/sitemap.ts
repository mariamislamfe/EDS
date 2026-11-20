import type { MetadataRoute } from "next";
import { SITE_URL, isConfigured } from "@/lib/env";
import { q } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL.replace(/\/$/, "");
  const statics = ["", "/students", "/dentists", "/shop", "/bundles"].map((p) => ({ url: `${base}${p}`, changeFrequency: "daily" as const }));
  if (!isConfigured) return statics;
  try {
    const rows = await q<{ path: string; updated_at: Date | null }>(`
      select '/products/' || slug as path, updated_at from products where is_published
      union all select '/students/' || slug, null from academic_years where is_enabled
      union all select '/dentists/' || slug, null from specialties where is_visible
      union all select '/categories/' || slug, null from categories where is_visible
      union all select '/bundles/' || slug, updated_at from bundles where is_published
      limit 10000`);
    return [...statics, ...rows.map((r) => ({ url: `${base}${encodeURI(r.path)}`, lastModified: r.updated_at ?? undefined }))];
  } catch {
    return statics;
  }
}
