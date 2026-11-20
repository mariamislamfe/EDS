"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateOrderStatus, updatePaymentStatus } from "@/lib/admin/catalog-actions";
import { Card, Field, useToast } from "./ui";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "./status";

export function OrderControls({ orderId, status, paymentStatus }: { orderId: string; status: string; paymentStatus: string }) {
  const router = useRouter();
  const toast = useToast();
  const [next, setNext] = useState(status);
  const [note, setNote] = useState("");
  const [pay, setPay] = useState(paymentStatus);
  const [pending, start] = useTransition();
  return (
    <Card title="Fulfillment">
      <form className="flex flex-col gap-3" onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await updateOrderStatus(orderId, next, note);
          if (r.ok) { toast("Status updated"); setNote(""); router.refresh(); } else toast(r.error, "error");
        });
      }}>
        <Field label="Order status">
          <select className="field capitalize" value={next} onChange={(e) => setNext(e.target.value)}>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Note (optional)" help="Saved in the order history, e.g. courier tracking number."><input className="field" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <button className="btn btn-primary" disabled={pending || (next === status && !note)}>Update status</button>
      </form>
      <div className="mt-5 border-t border-line pt-5">
        <Field label="Payment status">
          <select className="field" value={pay} onChange={(e) => {
            const v = e.target.value;
            setPay(v);
            start(async () => { const r = await updatePaymentStatus(orderId, v); if (r.ok) { toast("Payment status updated"); router.refresh(); } else toast(r.error, "error"); });
          }}>
            {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
          </select>
        </Field>
      </div>
    </Card>
  );
}
