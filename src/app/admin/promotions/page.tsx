import Link from "next/link";
import { requireStaffPage } from "@/lib/admin/auth";
import { EntityManager } from "@/components/admin/EntityManager";
import { loadEntityRows, loadOptions } from "@/components/admin/EntityPage";
import { PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Promotions" };

export default async function PromotionsAdmin() {
  await requireStaffPage();
  const [coupons, campaigns, options] = await Promise.all([loadEntityRows("coupons"), loadEntityRows("campaigns"), loadOptions()]);
  return (
    <>
      <PageHeader title="Promotions" text="Campaigns lower prices automatically across the store; coupons are codes customers enter at checkout. All discounts are calculated on the server." />
      <div className="mb-10 grid gap-3 sm:grid-cols-3">
        <Link href="/admin/products?flag=featured" className="rounded-2xl border border-line bg-white p-4 text-sm hover:border-navy"><span className="font-medium text-navy">Featured products</span><span className="block text-muted">Shown in the homepage hero and “Essential tools”.</span></Link>
        <Link href="/admin/products" className="rounded-2xl border border-line bg-white p-4 text-sm hover:border-navy"><span className="font-medium text-navy">Promotional prices</span><span className="block text-muted">Set an “Original price” on a product to show it as discounted.</span></Link>
        <Link href="/admin/content" className="rounded-2xl border border-line bg-white p-4 text-sm hover:border-navy"><span className="font-medium text-navy">Banners & announcement</span><span className="block text-muted">Promote a campaign on the homepage.</span></Link>
      </div>
      <h2 className="mb-2 text-xl font-semibold">Discount campaigns</h2>
      <p className="mb-2 text-sm text-muted">When several campaigns match a product, the customer gets the lowest price.</p>
      <EntityManager entity="campaigns" rows={campaigns} options={options} />
      <h2 className="mb-2 mt-12 text-xl font-semibold">Coupon codes</h2>
      <EntityManager entity="coupons" rows={coupons} options={options} />
    </>
  );
}
