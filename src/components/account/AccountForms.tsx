"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { changeCustomerPassword, loginCustomer, registerCustomer, updateCustomerProfile } from "@/app/account-actions";
import { cn } from "@/lib/utils";

export function AuthPanel({ next }: { next: string | null }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [v, setV] = useState({ name: "", phone: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = mode === "login" ? await loginCustomer({ phone: v.phone, password: v.password }) : await registerCustomer(v);
      if (!r.ok) { setError(r.error); return; }
      if (next) router.push(next); else router.refresh();
    });
  };

  return (
    <div className="rounded-[2rem] border border-line bg-white p-6 shadow-[0_40px_80px_-50px_rgb(2_42_82/0.45)] sm:p-8">
      <div className="relative mb-7 grid grid-cols-2 rounded-full bg-cloud p-1 text-sm font-medium">
        <span aria-hidden className={cn("absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-full bg-white shadow transition-transform duration-500 ease-[var(--ease-out-soft)]",
          mode === "register" ? "translate-x-[calc(100%)] rtl:-translate-x-full" : "translate-x-0")} style={{ insetInlineStart: "0.25rem" }} />
        {(["login", "register"] as const).map((m) => (
          <button key={m} type="button" onClick={() => { setMode(m); setError(null); }}
            className={cn("relative z-10 h-10 rounded-full transition-colors", mode === m ? "text-navy-deep" : "text-muted")} aria-pressed={mode === m}>
            {m === "login" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <>
          {mode === "register" && (
            <div data-enter className="overflow-hidden">
              <label className="label" htmlFor="a-name">Full name</label>
              <input id="a-name" className="field" autoComplete="name" value={v.name} onChange={set("name")} required={mode === "register"} />
            </div>
          )}
        </>
        <div>
          <label className="label" htmlFor="a-phone">Mobile number</label>
          <input id="a-phone" className="field" type="tel" dir="ltr" inputMode="tel" autoComplete="tel" placeholder="01xxxxxxxxx" value={v.phone} onChange={set("phone")} required />
        </div>
        <div>
          <label className="label" htmlFor="a-pw">Password</label>
          <input id="a-pw" className="field" type="password" dir="ltr" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "register" ? 6 : 1} value={v.password} onChange={set("password")} required />
          {mode === "register" && <p className="mt-1 text-xs text-muted">At least 6 characters.</p>}
        </div>
        {error && <p role="alert" className="rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</p>}
        <button className="btn btn-primary btn-lg mt-2 w-full" disabled={pending}>
          {pending ? "Please wait…" : mode === "login" ? "Sign in" : "Create my account"}
        </button>
        {mode === "login" && <p className="text-center text-xs text-muted">Forgot your password? Message us on WhatsApp and we&apos;ll reset it.</p>}
      </form>
    </div>
  );
}

export function ProfilePanel({ customer, governorates }: {
  customer: { name: string; email: string; governorate_id: string; city: string; address: string };
  governorates: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [v, setV] = useState(customer);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });
  return (
    <section className="rounded-[1.5rem] bg-cloud p-6">
      <h2 className="mb-4 text-lg font-semibold">Delivery details</h2>
      <form className="flex flex-col gap-3" onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await updateCustomerProfile(v);
          setMsg(r.ok ? { ok: true, text: "Saved — checkout will use these details." } : { ok: false, text: r.error });
          if (r.ok) router.refresh();
        });
      }}>
        <div><label className="label" htmlFor="p-name">Name</label><input id="p-name" className="field" value={v.name} onChange={set("name")} required /></div>
        <div><label className="label" htmlFor="p-email">Email <span className="font-normal text-muted">(optional)</span></label><input id="p-email" className="field" type="email" dir="ltr" value={v.email} onChange={set("email")} /></div>
        <div>
          <label className="label" htmlFor="p-gov">Governorate</label>
          <select id="p-gov" className="field" value={v.governorate_id} onChange={set("governorate_id")}>
            <option value="">—</option>
            {governorates.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div><label className="label" htmlFor="p-city">City / area</label><input id="p-city" className="field" value={v.city} onChange={set("city")} /></div>
        <div><label className="label" htmlFor="p-addr">Address</label><input id="p-addr" className="field" value={v.address} onChange={set("address")} /></div>
        {msg && <p className={cn("text-sm", msg.ok ? "text-success" : "text-danger")}>{msg.text}</p>}
        <button className="btn btn-primary btn-sm w-fit" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
      </form>
    </section>
  );
}

export function PasswordPanel() {
  const [v, setV] = useState({ current: "", next: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <section className="rounded-[1.5rem] border border-line p-6">
      <h2 className="mb-4 text-lg font-semibold">Change password</h2>
      <form className="flex flex-col gap-3" onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await changeCustomerPassword(v);
          setMsg(r.ok ? { ok: true, text: "Password changed. Other devices were signed out." } : { ok: false, text: r.error });
          if (r.ok) setV({ current: "", next: "" });
        });
      }}>
        <input className="field" type="password" dir="ltr" placeholder="Current password" aria-label="Current password" autoComplete="current-password" value={v.current} onChange={(e) => setV({ ...v, current: e.target.value })} required />
        <input className="field" type="password" dir="ltr" placeholder="New password" aria-label="New password" autoComplete="new-password" minLength={6} value={v.next} onChange={(e) => setV({ ...v, next: e.target.value })} required />
        {msg && <p className={cn("text-sm", msg.ok ? "text-success" : "text-danger")}>{msg.text}</p>}
        <button className="btn btn-ghost btn-sm w-fit" disabled={pending}>{pending ? "Saving…" : "Update password"}</button>
      </form>
    </section>
  );
}
