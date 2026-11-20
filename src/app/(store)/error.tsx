"use client";
import { useEffect } from "react";
import { useI18n } from "@/lib/i18n/client";

export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="container-x py-24">
      <div className="mx-auto max-w-xl rounded-3xl border border-line p-10 text-center">
        <h1 className="text-2xl font-semibold">{t.common.error}</h1>
        {error.digest && <p className="mt-2 text-xs text-muted" dir="ltr">ref: {error.digest}</p>}
        <button onClick={reset} className="btn btn-primary mt-6">{t.common.retry}</button>
      </div>
    </div>
  );
}
