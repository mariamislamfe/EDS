import Image from "next/image";
import Link from "next/link";
import { requireStaffPage } from "@/lib/admin/auth";
import { q } from "@/lib/db";
import { formatPrice } from "@/lib/i18n";
import { Badge, PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Bundles" };

export default async function BundlesAdmin() {
  await requireStaffPage();
  const data = await q<{ id: string; slug: string; name_en: string; image_url: string | null; year_name_en: string | null; pricing_mode: string;
    effective_price: number; items_value: number; item_count: number; is_published: boolean; is_featured: boolean; in_stock: boolean }>(
    `select id, slug, name_en, image_url, year_name_en, pricing_mode, effective_price, items_value, item_count, is_published, is_featured, in_stock
       from catalog_bundles order by year_number nulls last, sort_order`);
  return (
    <>
      <PageHeader title="Bundles" text="Ready-made kits for each academic year. Customers see exactly what's inside before buying."
        actions={<Link href="/admin/bundles/new" className="btn btn-primary btn-sm">New bundle</Link>} />
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-cloud/60 text-left text-xs text-muted"><tr>
            <th className="px-4 py-3 font-medium">Bundle</th><th className="font-medium">Year</th><th className="font-medium">Items</th><th className="font-medium">Pricing</th><th className="font-medium">Price</th><th className="font-medium">Status</th>
          </tr></thead>
          <tbody className="divide-y divide-line">
            {(data ?? []).map((b) => (
              <tr key={b.id} className="hover:bg-cloud/50">
                <td className="px-4 py-2.5"><Link href={`/admin/bundles/${b.id}`} className="flex items-center gap-3 font-medium hover:text-navy">
                  <span className="relative size-11 overflow-hidden rounded-lg bg-cloud">{b.image_url && <Image src={b.image_url} alt="" fill sizes="44px" className="object-contain" />}</span>{b.name_en}</Link></td>
                <td>{b.year_name_en ?? <span className="text-muted">—</span>}</td>
                <td className="tabular-nums">{b.item_count}</td>
                <td className="text-muted">{b.pricing_mode === "fixed" ? "Fixed" : "From items"}</td>
                <td className="tabular-nums">{formatPrice(b.effective_price, "en")}{Number(b.items_value) > Number(b.effective_price) && <span className="ms-1 text-xs text-muted">(worth {formatPrice(b.items_value, "en")})</span>}</td>
                <td><div className="flex gap-1">{b.is_published ? <Badge tone="ok">Published</Badge> : <Badge>Draft</Badge>}{!b.in_stock && <Badge tone="danger">Item out of stock</Badge>}</div></td>
              </tr>
            ))}
            {!data?.length && <tr><td colSpan={6} className="py-12 text-center text-muted">No bundles yet. Create your first year kit.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
