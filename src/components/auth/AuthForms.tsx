"use client";
import Link from "next/link";
import { useActionState } from "react";
import { resetPassword, sendReset, signIn, signUp, updateProfile, type AuthState } from "@/app/(store)/auth-actions";
import { useI18n } from "@/lib/i18n/client";

function Msg({ state }: { state: AuthState }) {
  const { t } = useI18n();
  if (!state) return null;
  const dict = { ...t.auth, saved: t.common.saved } as Record<string, string>;
  if (state.error) return <p role="alert" className="rounded-xl bg-danger/10 p-3 text-sm text-danger">{dict[state.error] ?? state.error}</p>;
  if (state.message) return <p role="status" className="rounded-xl bg-mist p-3 text-sm text-navy">{dict[state.message] ?? state.message}</p>;
  return null;
}

export function LoginForm({ next }: { next: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(signIn, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <div><label className="label" htmlFor="email">{t.auth.email}</label><input id="email" name="email" type="email" required autoComplete="email" dir="ltr" className="field" /></div>
      <div><label className="label" htmlFor="password">{t.auth.password}</label><input id="password" name="password" type="password" required autoComplete="current-password" className="field" /></div>
      <Msg state={state} />
      <button className="btn btn-primary h-12" disabled={pending}>{pending ? t.common.loading : t.auth.signIn}</button>
      <Link href="/forgot-password" className="text-sm text-teal-strong hover:underline">{t.auth.forgot}</Link>
    </form>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(signUp, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <div><label className="label" htmlFor="full_name">{t.auth.fullName}</label><input id="full_name" name="full_name" required autoComplete="name" className="field" /></div>
      <div><label className="label" htmlFor="phone">{t.auth.phone}</label><input id="phone" name="phone" type="tel" autoComplete="tel" dir="ltr" className="field" /></div>
      <div><label className="label" htmlFor="email">{t.auth.email}</label><input id="email" name="email" type="email" required autoComplete="email" dir="ltr" className="field" /></div>
      <div><label className="label" htmlFor="password">{t.auth.password}</label><input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="field" />
        <p className="mt-1 text-xs text-muted">{t.auth.weakPassword}</p></div>
      <Msg state={state} />
      <button className="btn btn-primary h-12" disabled={pending}>{pending ? t.common.loading : t.auth.signUp}</button>
    </form>
  );
}

export function ForgotForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(sendReset, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <div><label className="label" htmlFor="email">{t.auth.email}</label><input id="email" name="email" type="email" required dir="ltr" className="field" /></div>
      <Msg state={state} />
      <button className="btn btn-primary h-12" disabled={pending}>{t.auth.sendReset}</button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(resetPassword, undefined);
  if (state?.message === "passwordUpdated") {
    return (
      <div className="flex flex-col gap-4">
        <Msg state={state} />
        <Link href="/login" className="btn btn-primary h-12">{t.auth.signIn}</Link>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <div><label className="label" htmlFor="password">{t.auth.newPassword}</label><input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="field" /></div>
      <Msg state={state} />
      <button className="btn btn-primary h-12" disabled={pending}>{t.auth.updatePassword}</button>
    </form>
  );
}

export function ProfileForm({ fullName, phone }: { fullName: string; phone: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(updateProfile, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <div><label className="label" htmlFor="full_name">{t.auth.fullName}</label><input id="full_name" name="full_name" defaultValue={fullName} required className="field" /></div>
      <div><label className="label" htmlFor="phone">{t.auth.phone}</label><input id="phone" name="phone" defaultValue={phone} type="tel" dir="ltr" className="field" /></div>
      <Msg state={state} />
      <button className="btn btn-primary" disabled={pending}>{pending ? t.common.saving : t.account.saveProfile}</button>
    </form>
  );
}
