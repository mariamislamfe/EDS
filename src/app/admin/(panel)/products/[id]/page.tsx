import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireStaffPage } from "@/lib/admin/auth";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/ProductForm";
import { loadProduct, loadProductOptions } from "@/components/admin/productFormData";

export const metadata = { title: "Edit product" };

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  await requireStaffPage();
  const [loaded, options] = await Promise.all([loadProduct(id), loadProductOptions()]);
  if (!loaded) notFound();
  return (
    <>
      <Link href="/admin/products" className="text-sm text-muted hover:text-navy">← Products</Link>
      <PageHeader title={loaded.data.name_en || loaded.data.name_ar || "Product"} />
      <ProductForm key={id} initial={loaded.data} related={loaded.related} options={options} />
    </>
  );
}
