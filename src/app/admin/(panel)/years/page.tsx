import { requireStaffPage } from "@/lib/admin/auth";
import { q } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { YearsManager, type YearRow } from "@/components/admin/YearsManager";

export const metadata = { title: "Academic years" };

export default async function YearsAdmin() {
  await requireStaffPage();
  type Y = { id: string; slug: string; number: number; name_en: string; name_ar: string | null; tagline_en: string | null; tagline_ar: string | null;
    intro_en: string | null; intro_ar: string | null; hero_image_url: string | null; is_enabled: boolean; sort_order: number; product_count: number };
  const [years, checklist, subjects] = await Promise.all([
    q<Y>(`select y.*, (select count(*) from product_years py where py.year_id = y.id) as product_count from academic_years y order by number`),
    q<{ year_id: string; label_en: string; label_ar: string | null; product_id: string | null; product_name: string | null }>(
      `select c.year_id, c.label_en, c.label_ar, c.product_id, coalesce(p.name_en, p.name_ar) as product_name
         from year_checklist_items c left join products p on p.id = c.product_id order by c.sort_order`),
    q<{ id: string; year_id: string; slug: string; name_en: string; name_ar: string | null; description_en: string | null; image_url: string | null }>(
      `select id, year_id, slug, name_en, name_ar, description_en, image_url from year_subjects order by sort_order`),
  ]);
  const rows: YearRow[] = years.map((y) => {
    const items = checklist.filter((c) => c.year_id === y.id);
    return {
      id: y.id, slug: y.slug, number: y.number, name_en: y.name_en, name_ar: y.name_ar, tagline_en: y.tagline_en, tagline_ar: y.tagline_ar,
      intro_en: y.intro_en, intro_ar: y.intro_ar, hero_image_url: y.hero_image_url, is_enabled: y.is_enabled, sort_order: y.sort_order,
      checklist: items.map((c) => ({ label_en: c.label_en, label_ar: c.label_ar, product_id: c.product_id })),
      subjects: subjects.filter((s) => s.year_id === y.id).map(({ year_id: _y, ...s }) => s),
      checklist_names: Object.fromEntries(items.filter((c) => c.product_id).map((c) => [c.product_id!, c.product_name ?? ""])),
      product_count: Number(y.product_count),
    };
  });
  return (
    <>
      <PageHeader title="Academic years" text="Each enabled year gets its own page at /students/<slug>. Products appear there when they're assigned to the year and their audience is Students or Both." />
      <YearsManager years={rows} />
    </>
  );
}
