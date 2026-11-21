import Link from "next/link";
import { requireStaffPage } from "@/lib/admin/auth";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/ProductForm";
import { EMPTY_PRODUCT, loadProductOptions } from "@/components/admin/productFormData";

export const metadata = { title: "New product" };

export default async function NewProduct() {
  await requireStaffPage();
  const options = await loadProductOptions();
  return (
    <>
      <Link href="/admin/products" className="text-sm text-muted hover:text-navy">← Products</Link>
      <PageHeader title="New product" />
      <ProductForm initial={EMPTY_PRODUCT} related={[]} options={options} />
    </>
  );
}
