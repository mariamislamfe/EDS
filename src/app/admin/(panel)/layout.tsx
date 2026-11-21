import { requireStaffPage } from "@/lib/admin/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { ToastProvider } from "@/components/admin/ui";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireStaffPage();
  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[16rem_1fr]">
      <AdminNav />
      <main className="min-w-0 px-4 pb-16 pt-6 sm:px-6 lg:px-10 lg:pt-10"><ToastProvider>{children}</ToastProvider></main>
    </div>
  );
}
