export const ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"] as const;
export const PAYMENT_STATUSES = ["unpaid", "pending_verification", "paid", "refunded"] as const;

export function statusTone(s: string): "neutral" | "ok" | "warn" | "danger" | "info" {
  if (s === "pending") return "warn";
  if (s === "delivered" || s === "paid") return "ok";
  if (s === "cancelled" || s === "refunded") return "danger";
  if (s === "unpaid") return "neutral";
  return "info";
}
