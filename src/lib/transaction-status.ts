import type { BookingRow } from "@/lib/admin-bookings-data";

export interface TxStatus {
  label: string;
  tone: "success" | "warning" | "danger" | "info";
}

// The one place the Payments & Earnings surface decides how a booking's
// payment/escrow state reads as a transaction status label — reused by the
// Transactions table and the Payment Details page so the two never disagree.
export function transactionStatus(b: BookingRow): TxStatus {
  if (b.amountGross === 0) return { label: b.status, tone: "info" };
  if (b.paymentStatus === "Released") return { label: "Paid", tone: "success" };
  if (b.paymentStatus === "Held in Escrow" || b.paymentStatus === "Awaiting Payment") return { label: "Pending", tone: "warning" };
  if (b.paymentStatus === "Refunded") return { label: "Refunded", tone: "danger" };
  return { label: b.paymentStatus, tone: "info" };
}

export const statusToneStyles: Record<TxStatus["tone"], string> = {
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-rose-100 text-rose-700",
  info: "bg-blue-100 text-blue-700",
};
