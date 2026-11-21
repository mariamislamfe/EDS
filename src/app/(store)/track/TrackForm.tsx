"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { trackOrder } from "@/app/actions";
import { useI18n } from "@/lib/i18n/client";

export function TrackForm() {
  const { t } = useI18n();
  const router = useRouter();
  const [number, setNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  return (
    <form className="flex max-w-md flex-col gap-4" onSubmit={(e) => {
      e.preventDefault();
      setError(false);
      start(async () => {
        const r = await trackOrder({ number, phone });
        if (r.ok) router.push(r.href); else setError(true);
      });
    }}>
      <label className="flex flex-col gap-1.5 text-sm font-medium">{t.track.number}
        <input className="field" dir="ltr" placeholder="EDS-10001" required value={number} onChange={(e) => setNumber(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">{t.track.phone}
        <input className="field" dir="ltr" type="tel" inputMode="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} />
      </label>
      {error && <p className="text-sm text-danger" role="alert">{t.track.notFound}</p>}
      <button className="btn btn-primary w-fit" disabled={pending}>{t.track.submit}</button>
    </form>
  );
}
