import { EntityPage } from "@/components/admin/EntityPage";

export const metadata = { title: "Brands" };

export default function BrandsAdmin() {
  return <EntityPage entity="brands" text="Brands used for filtering and brand pages. Assign a brand to a product from its edit page." />;
}
