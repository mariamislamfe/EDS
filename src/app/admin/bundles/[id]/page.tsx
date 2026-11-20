import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireStaffPage } from "@/lib/admin/auth";
import { one, q } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { BundleForm, type BundleItemRow } from "@/components/admin/BundleForm";

export const metadata = { title: "Edit bundle" };

export default async function EditBundle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  await requireStaffPage();
  type B = { id: string; slug: string; name_en: string; name_ar: string | null; description_en: string | null; description_ar: string | null; year_id: string | null;
    image_url: string | null; gallery: string[] | null; pricing_mode: "fixed" | "sum_of_items"; price: number | null; compare_at_price: number | null;
    discount_percent: number; is_published: boolean; is_featured: boolean; sort_order: number };
  const [b, items, years] = await Promise.all([
    one<B>(`select * from bundles where id = $1`, [id]),
    q<{ product_id: string; variant_id: string | null; quantity: number; name: string; price: number; image: string | null;
        variants: { id: string; options: Record<string, string>; price: number }[] }>(
      `select i.product_id, i.variant_id, i.quantity, coalesce(p.name_en, p.name_ar) as name, p.price,
              (select url from product_images pi where pi.product_id = p.id order by sort_order limit 1) as image,
              coalesce((select json_agg(json_build_object('id', v.id, 'options', v.options, 'price', v.price) order by v.sort_order)
                          from product_variants v where v.product_id = p.id and v.is_active), '[]') as variants
         from bundle_items i join products p on p.id = i.product_id
        where i.bundle_id = $1 order by i.sort_order`, [id]),
    q<{ id: string; name_en: string }>(`select id, name_en from academic_years order by number`),
  ]);
  if (!b) notFound();
  const rows: BundleItemRow[] = items.map((i) => ({
    product_id: i.product_id, variant_id: i.variant_id, quantity: i.quantity, name: i.name, unit_price: Number(i.price), image: i.image,
    variants: i.variants.map((v) => ({ id: v.id, label: Object.values(v.options).join(" / "), price: Number(v.price) })),
  }));
  return (
    <>
      <Link href="/admin/bundles" className="text-sm text-muted hover:text-navy">← Bundles</Link>
      <PageHeader title={b.name_en} />
      <BundleForm
        key={id}
        years={(years ?? []).map((y) => ({ value: y.id, label: y.name_en }))}
        items={rows}
        initial={{ id: b.id, slug: b.slug, name_en: b.name_en, name_ar: b.name_ar, description_en: b.description_en, description_ar: b.description_ar,
          year_id: b.year_id, image_url: b.image_url, gallery: b.gallery ?? [], pricing_mode: b.pricing_mode,
          price: b.price == null ? null : Number(b.price), compare_at_price: b.compare_at_price == null ? null : Number(b.compare_at_price),
          discount_percent: Number(b.discount_percent), is_published: b.is_published, is_featured: b.is_featured, sort_order: b.sort_order }}
      />
    </>
  );
}
