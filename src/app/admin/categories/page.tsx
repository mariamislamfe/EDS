import { EntityPage } from "@/components/admin/EntityPage";

export const metadata = { title: "Categories" };

export default function CategoriesAdmin() {
  return <EntityPage entity="categories" text="Product categories shown in navigation, filters and category pages. A product can belong to several categories." />;
}
