import Link from "next/link";
import { requireStaffPage } from "@/lib/admin/auth";
import { q } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { ProductTable, type AdminProductRow } from "@/components/admin/ProductTable";

export const metadata = { title: "Products" };

type SP = Record<string, string | undefined>;
const PER = 50;
const uuidOrNull = (v?: string) => (v && /^[0-9a-f-]{36}$/i.test(v) ? v : null);

export default async function ProductsAdmin({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  await requireStaffPage();
  const page = Math.max(1, Number(sp.page) || 1);
  const audience = ["unassigned", "student", "dentist", "both"].includes(sp.audience ?? "") ? sp.audience! : null;
  const flagCol = sp.flag === "featured" ? "is_featured" : sp.flag === "best" ? "is_best_seller" : sp.flag === "new" ? "is_new_arrival" : null;
  const order = sp.sort === "name" ? "p.name_en asc nulls last" : sp.sort === "price" ? "p.price asc" : sp.sort === "stock" ? "p.stock_qty asc" : "p.updated_at desc";

  type Raw = {
    id: string; slug: string; name_en: string | null; name_ar: string | null; sku: string | null; price: number; compare_at_price: number | null;
    stock_qty: number; track_inventory: boolean; is_low_stock: boolean; audience: string; is_published: boolean; is_featured: boolean;
    is_best_seller: boolean; is_new_arrival: boolean; brand: string | null; image: string | null; categories: number; years: number; full_count: number;
  };
  const [data, cats, years, specs] = await Promise.all([
    q<Raw>(
      `select p.id, p.slug, p.name_en, p.name_ar, p.sku, p.price, p.compare_at_price, p.stock_qty, p.track_inventory, p.is_low_stock, p.audience,
              p.is_published, p.is_featured, p.is_best_seller, p.is_new_arrival, b.name as brand,
              (select url from product_images i where i.product_id = p.id order by sort_order limit 1) as image,
              (select count(*) from product_categories pc where pc.product_id = p.id) as categories,
              (select count(*) from product_years py where py.product_id = p.id) as years,
              count(*) over() as full_count
         from products p left join brands b on b.id = p.brand_id
        where ($1::text is null or p.search_text like '%' || lower($1) || '%')
          and ($2::text is null or p.audience::text = $2)
          and ($3::text is null or ($3 = 'published' and p.is_published) or ($3 = 'draft' and not p.is_published))
          and (not $4::boolean or p.is_low_stock)
          and ($5::uuid is null or exists (select 1 from product_categories pc where pc.product_id = p.id and pc.category_id = $5))
          and ($6::uuid is null or exists (select 1 from product_years py where py.product_id = p.id and py.year_id = $6))
          and ($7::uuid is null or exists (select 1 from product_specialties ps where ps.product_id = p.id and ps.specialty_id = $7))
          ${flagCol ? `and p.${flagCol}` : ""}
        order by ${order}
        offset $8 limit $9`,
      [sp.q?.trim() || null, audience, sp.status === "published" || sp.status === "draft" ? sp.status : null, sp.stock === "low",
        uuidOrNull(sp.category), uuidOrNull(sp.year), uuidOrNull(sp.specialty), (page - 1) * PER, PER]),
    q<{ value: string; label: string }>(`select id as value, name_en as label from categories order by sort_order`),
    q<{ value: string; label: string }>(`select id as value, name_en as label from academic_years order by number`),
    q<{ value: string; label: string }>(`select id as value, name_en as label from specialties order by sort_order`),
  ]);

  const rows: AdminProductRow[] = data.map((p) => ({
    id: p.id, slug: p.slug, name: p.name_en || p.name_ar || "", sku: p.sku, price: Number(p.price),
    compare: p.compare_at_price == null ? null : Number(p.compare_at_price),
    stock: p.track_inventory ? p.stock_qty : null, low: p.is_low_stock, audience: p.audience, published: p.is_published,
    featured: p.is_featured, best: p.is_best_seller, isNew: p.is_new_arrival, brand: p.brand, image: p.image,
    categories: Number(p.categories), years: Number(p.years),
  }));

  return (
    <>
      <PageHeader title="Products" text="One catalog for both shopping experiences. A product's audience, years, specialties and categories decide where it appears."
        actions={<Link href="/admin/products/new" className="btn btn-primary btn-sm">Add product</Link>} />
      <ProductTable rows={rows} total={data[0]?.full_count ?? 0} page={page} perPage={PER} params={sp} categories={cats} years={years} specialties={specs} />
    </>
  );
}
