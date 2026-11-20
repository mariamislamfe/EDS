import { redirect } from "next/navigation";
import { requireStaffPage } from "@/lib/admin/auth";
import { q } from "@/lib/db";
import { TeamForm } from "@/components/admin/SettingsForms";
import { Badge, Card, PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Team" };

export default async function TeamAdmin() {
  const { role } = await requireStaffPage();
  if (role !== "admin") redirect("/admin");
  const data = await q<{ id: string; email: string | null; full_name: string | null; role: string }>(
    `select id, email, full_name, role from profiles where role in ('admin', 'staff') order by role, email`);
  return (
    <>
      <PageHeader title="Team" text="Staff can manage products, bundles, orders and content. Admins can also change store settings and the team." />
      <div className="flex flex-col gap-6">
        <TeamForm />
        <Card title="Members with dashboard access">
          <ul className="divide-y divide-line text-sm">
            {(data ?? []).map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                <span><span className="font-medium">{m.full_name || "—"}</span><span className="block text-muted">{m.email}</span></span>
                <Badge tone={m.role === "admin" ? "info" : "neutral"}>{m.role}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
