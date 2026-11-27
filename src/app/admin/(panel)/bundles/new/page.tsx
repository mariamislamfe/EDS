import Link from "next/link";
import { requireStaffPage } from "@/lib/admin/auth";
import { q } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { BundleForm } from "@/components/admin/BundleForm";

export const metadata = { title: "New bundle" };

export default async function NewBundle() {
  await requireStaffPage();
  const years = await q<{ id: string; name_en: string }>(`select id, name_en from academic_years order by number`);
  return (
    <>
      <Link href="/admin/bundles" className="text-sm text-muted hover:text-navy">← Bundles</Link>
      <PageHeader title="New bundle" />
      <BundleForm
        years={(years ?? []).map((y) => ({ value: y.id, label: y.name_en }))}
        items={[]}
        initial={{ id: null, slug: "", name_en: "", name_ar: "", description_en: "", description_ar: "", year_id: null, image_url: null, gallery: [],
          pricing_mode: "fixed", price: null, compare_at_price: null, discount_percent: 0, is_published: false, is_featured: false, sort_order: 0, kind: "kit", audience: "student" }}
      />
    </>
  );
}
