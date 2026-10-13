// Admin -> Payments & Earnings -> Tutor Payouts. A tutor requesting a
// withdrawal (already modelled per-tutor in tutor-dashboard-data.ts's
// withdrawals page) becomes, from the admin side, a request that needs
// review across ALL tutors — a genuinely different shape (multi-tutor
// queue vs. one tutor's own history), so this is its own array rather than
// reusing that single-tutor one. Earnings breakdowns reference real
// bookings/commission math instead of inventing figures.
import { initialBookings } from "@/lib/admin-bookings-data";
import { buildBookingReference, isValidBookingReference } from "@/lib/booking-reference";
import { splitEarnings } from "@/lib/commission";

export type PayoutStatus = "Pending Review" | "Processing" | "Paid" | "Failed" | "Rejected";

export const payoutStatusStyles: Record<PayoutStatus, string> = {
  "Pending Review": "bg-amber-100 text-amber-700",
  Processing: "bg-blue-100 text-blue-700",
  Paid: "bg-emerald-100 text-emerald-700",
  Failed: "bg-rose-100 text-rose-700",
  Rejected: "bg-ensena-bg-soft text-ensena-muted",
};

export interface PayoutEarningSource {
  bookingId: string;
  bookingReference: string;
  student: string;
  type: string;
  date: string;
  tutorEarnings: number;
}

export interface PayoutAuditEntry {
  action: string;
  actor: string;
  time: string;
}

export interface PayoutRequest {
  id: string;
  tutor: string;
  tutorImage: string;
  tutorSubject: string;
  amount: number;
  bankName: string;
  accountLast4: string;
  accountName: string;
  requestedLabel: string;
  requestedAgo: string;
  status: PayoutStatus;
  availableBalanceBefore: number;
  earningsBreakdown: PayoutEarningSource[];
  rejectionReason?: string;
  adminNote?: string;
  failureReason?: string;
  auditTrail: PayoutAuditEntry[];
}

export const rejectionReasonOptions = [
  "Incorrect payout information",
  "Account verification issue",
  "Suspicious activity",
  "Insufficient available balance",
  "Other",
];

function tutorImageFor(name: string): string {
  return initialBookings.find((b) => b.tutor === name)?.tutorImage ?? "/teacher-2.jpg.png";
}

function earningsFor(tutorName: string, take: number): PayoutEarningSource[] {
  return initialBookings
    .filter((b) => b.tutor === tutorName && b.amountGross > 0 && b.paymentStatus === "Released")
    .slice(0, take)
    .map((b) => ({
      bookingId: b.id,
      bookingReference: b.bookingReference,
      student: b.student,
      type: b.type,
      date: b.date,
      tutorEarnings: splitEarnings(b.amountGross).net,
    }));
}

function sumEarnings(sources: PayoutEarningSource[]): number {
  return sources.reduce((s, e) => s + e.tutorEarnings, 0);
}

const tundeEarnings = earningsFor("Tunde Adebayo", 2);
const adaezeEarnings = earningsFor("Adaeze Okonkwo", 1);
const michaelEarnings = earningsFor("Michael Adewale", 2);
const zainabEarnings = earningsFor("Zainab Yusuf", 1);
const farukEarnings = earningsFor("Faruk Musa", 1);

export const initialPayoutRequests: PayoutRequest[] = [
  {
    id: "py-1",
    tutor: "Tunde Adebayo",
    tutorImage: tutorImageFor("Tunde Adebayo"),
    tutorSubject: "Mathematics Tutor",
    amount: 20000,
    bankName: "GTBank",
    accountLast4: "4521",
    accountName: "Tunde Adebayo",
    requestedLabel: "Aug 28, 2026 · 10:32 AM",
    requestedAgo: "10 minutes ago",
    status: "Pending Review",
    availableBalanceBefore: sumEarnings(tundeEarnings) || 20000,
    earningsBreakdown: tundeEarnings,
    auditTrail: [{ action: "Withdrawal requested", actor: "Tunde Adebayo", time: "Aug 28 · 10:32 AM" }],
  },
  {
    id: "py-2",
    tutor: "Adaeze Okonkwo",
    tutorImage: tutorImageFor("Adaeze Okonkwo"),
    tutorSubject: "Mathematics & Physics Tutor",
    amount: 3000,
    bankName: "Access Bank",
    accountLast4: "8832",
    accountName: "Adaeze Okonkwo",
    requestedLabel: "Aug 28, 2026 · 9:58 AM",
    requestedAgo: "35 minutes ago",
    status: "Pending Review",
    availableBalanceBefore: sumEarnings(adaezeEarnings) || 3000,
    earningsBreakdown: adaezeEarnings,
    auditTrail: [{ action: "Withdrawal requested", actor: "Adaeze Okonkwo", time: "Aug 28 · 9:58 AM" }],
  },
  {
    id: "py-3",
    tutor: "Michael Adewale",
    tutorImage: tutorImageFor("Michael Adewale"),
    tutorSubject: "Chemistry & Biology Tutor",
    amount: 5000,
    bankName: "Zenith Bank",
    accountLast4: "1120",
    accountName: "Michael Adewale",
    requestedLabel: "Aug 27, 2026 · 4:10 PM",
    requestedAgo: "1 day ago",
    status: "Processing",
    availableBalanceBefore: sumEarnings(michaelEarnings) || 5000,
    earningsBreakdown: michaelEarnings,
    auditTrail: [
      { action: "Withdrawal requested", actor: "Michael Adewale", time: "Aug 27 · 4:10 PM" },
      { action: "Approved", actor: "Benny (Admin)", time: "Aug 27 · 5:02 PM" },
      { action: "Submitted to payment provider", actor: "System", time: "Aug 27 · 5:03 PM" },
    ],
  },
  {
    id: "py-4",
    tutor: "Zainab Yusuf",
    tutorImage: tutorImageFor("Zainab Yusuf"),
    tutorSubject: "Biology Tutor",
    amount: 9000,
    bankName: "GTBank",
    accountLast4: "7765",
    accountName: "Zainab Yusuf",
    requestedLabel: "Aug 26, 2026 · 11:20 AM",
    requestedAgo: "2 days ago",
    status: "Paid",
    availableBalanceBefore: sumEarnings(zainabEarnings) || 9000,
    earningsBreakdown: zainabEarnings,
    auditTrail: [
      { action: "Withdrawal requested", actor: "Zainab Yusuf", time: "Aug 26 · 11:20 AM" },
      { action: "Approved", actor: "Benny (Admin)", time: "Aug 26 · 1:15 PM" },
      { action: "Submitted to payment provider", actor: "System", time: "Aug 26 · 1:16 PM" },
      { action: "Payment confirmed", actor: "Payment provider", time: "Aug 26 · 1:22 PM" },
    ],
  },
  {
    id: "py-5",
    tutor: "Faruk Musa",
    tutorImage: tutorImageFor("Faruk Musa"),
    tutorSubject: "Mathematics Tutor",
    amount: 15000,
    bankName: "Zenith Bank",
    accountLast4: "3390",
    accountName: "Faruk Musa",
    requestedLabel: "Aug 25, 2026 · 2:40 PM",
    requestedAgo: "3 days ago",
    status: "Failed",
    availableBalanceBefore: sumEarnings(farukEarnings) || 15000,
    earningsBreakdown: farukEarnings,
    failureReason: "Bank account could not be credited.",
    auditTrail: [
      { action: "Withdrawal requested", actor: "Faruk Musa", time: "Aug 25 · 2:40 PM" },
      { action: "Approved", actor: "Benny (Admin)", time: "Aug 25 · 3:10 PM" },
      { action: "Submitted to payment provider", actor: "System", time: "Aug 25 · 3:11 PM" },
      { action: "Payment failed", actor: "Payment provider", time: "Aug 25 · 3:20 PM", },
    ],
  },
  {
    id: "py-6",
    tutor: "Ibrahim Suleiman",
    tutorImage: tutorImageFor("Ibrahim Suleiman"),
    tutorSubject: "Biology Tutor",
    amount: 6000,
    bankName: "GTBank",
    accountLast4: "5610",
    accountName: "Ibrahim Suleiman",
    requestedLabel: "Aug 24, 2026 · 9:00 AM",
    requestedAgo: "4 days ago",
    status: "Rejected",
    availableBalanceBefore: 6000,
    earningsBreakdown: [],
    rejectionReason: "Account verification issue",
    adminNote: "Payout account name doesn't match the verified tutor profile name. Please update your bank details.",
    auditTrail: [
      { action: "Withdrawal requested", actor: "Ibrahim Suleiman", time: "Aug 24 · 9:00 AM" },
      { action: "Rejected", actor: "Benny (Admin)", time: "Aug 24 · 10:15 AM" },
    ],
  },
];

// Seed rows (e.g. "py-1") have no real reference of their own, so their
// display id is derived deterministically from the seed id. A payout
// actually created at runtime (payout-store.ts's requestPayout) already
// uses its real generateUniqueReferenceCode value as `id` — re-hashing that
// through buildBookingReference would silently produce a second, different
// code, so real ids are returned as-is.
export function formatPayoutDisplayId(id: string): string {
  return isValidBookingReference(id) ? id : buildBookingReference("payout", id);
}

export const payoutSummaryStats = {
  pendingCount: initialPayoutRequests.filter((p) => p.status === "Pending Review").length + 10,
  amountPending: initialPayoutRequests.filter((p) => p.status === "Pending Review").reduce((s, p) => s + p.amount, 0) + 448000,
  processingCount: initialPayoutRequests.filter((p) => p.status === "Processing").length + 3,
  paidThisMonth: 3200000,
  failedCount: initialPayoutRequests.filter((p) => p.status === "Failed").length + 1,
};
