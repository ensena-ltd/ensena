"use client";

import { useMemo, useSyncExternalStore } from "react";

import {
  getBookingPaymentSummary,
  getPaymentPlans,
  getSubscriptions,
  subscribePaymentPlans,
  type BookingPaymentSummary,
  type PaymentPlan,
  type Subscription,
} from "@/lib/payment-plans-store";

const EMPTY_PLANS: PaymentPlan[] = [];
const EMPTY_SUBS: Subscription[] = [];

// Server snapshot pinned to empty (no payments exist until a student pays) —
// same hydration-safety reasoning as use-group-class-enrollments.ts.
function getServerPlansSnapshot(): PaymentPlan[] {
  return EMPTY_PLANS;
}
function getServerSubsSnapshot(): Subscription[] {
  return EMPTY_SUBS;
}

export function usePaymentPlans(): PaymentPlan[] {
  return useSyncExternalStore(subscribePaymentPlans, getPaymentPlans, getServerPlansSnapshot);
}

export function useSubscriptions(): Subscription[] {
  return useSyncExternalStore(subscribePaymentPlans, getSubscriptions, getServerSubsSnapshot);
}

// The ONE reactive read every dashboard (student/tutor/admin) uses to show
// a booking's real payment plan — re-computes whenever any payment record
// changes anywhere in the app, so a subscription cancelled on one screen is
// reflected immediately on any other screen showing the same booking.
export function useBookingPaymentSummary(bookingId: string): BookingPaymentSummary {
  const plans = usePaymentPlans();
  const subs = useSubscriptions();
  return useMemo(
    () => getBookingPaymentSummary(bookingId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bookingId, plans, subs]
  );
}
