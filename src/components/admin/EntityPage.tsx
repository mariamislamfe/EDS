import { requireStaffPage } from "@/lib/admin/auth";
import { ENTITIES, type EntityKey } from "@/lib/admin/entities";
import { q } from "@/lib/db";
import { EntityManager } from "./EntityManager";
import { PageHeader } from "./ui";

type Opt = { value: string; label: string };

/** Loads the options lists the generic forms may need. */
export async function loadOptions() {
  await requireStaffPage();
  const [categories, brands, specialties, years, products] = await Promise.all([
    q<Opt>(`select id as value, name_en as label from categories order by sort_order, name_en`),
    q<Opt>(`select id as value, name as label from brands order by name`),
    q<Opt>(`select id as value, name_en as label from specialties order by sort_order`),
    q<Opt>(`select id as value, name_en as label from academic_years order by number`),
    q<Opt>(`select id as value, coalesce(name_en, name_ar) as label from products where is_published order by name_en nulls last limit 1000`),
  ]);
  return { categories, brands, specialties, years, products };
}

/** All rows of a configured admin table, in its configured order. */
export async function loadEntityRows(entity: EntityKey) {
  const def = ENTITIES[entity];
  const order = (def.orderBy as { column: string; ascending?: boolean }[])
    .map((o) => `"${o.column}" ${o.ascending === false ? "desc" : "asc"}`).join(", ");
  return q<Record<string, unknown> & { id: string }>(`select * from "${def.table}" order by ${order} limit 1000`);
}

export async function EntityPage({ entity, text, extra }: { entity: EntityKey; text?: string; extra?: React.ReactNode }) {
  await requireStaffPage();
  const def = ENTITIES[entity];
  const [rows, options] = await Promise.all([loadEntityRows(entity), loadOptions()]);
  return (
    <>
      <PageHeader title={def.title} text={text} />
      {extra}
      <EntityManager entity={entity} rows={rows} options={options} />
    </>
  );
}
