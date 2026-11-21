"use client";
import { useActionState } from "react";
import { adminLogin } from "@/lib/admin/session-actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(adminLogin, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Password
        <input name="password" type="password" className="field" dir="ltr" autoComplete="current-password" autoFocus required />
      </label>
      {state?.error && <p className="text-sm text-danger" role="alert">{state.error}</p>}
      <button className="btn btn-primary" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
