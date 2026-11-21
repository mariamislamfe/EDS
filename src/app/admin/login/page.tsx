import Image from "next/image";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin/auth";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };

export default async function AdminLogin() {
  if (await isAdmin()) redirect("/admin");
  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <div className="w-full max-w-sm rounded-3xl border border-line bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <Image src="/brand/eds-mark.png" alt="" width={40} height={40} />
          <div className="leading-tight"><p className="font-display text-lg font-bold text-navy">EDS Dashboard</p><p className="text-sm text-muted">Enter the dashboard password</p></div>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
