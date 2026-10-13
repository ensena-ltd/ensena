import { revenueBySubject } from "@/lib/tutor-dashboard-data";

export interface EarningsInsights {
  headline: string;
  topSubjectShare: string;
  busiestTime: string;
  atRiskStudents: string;
  suggestedAction: string;
  topRetention: string[];
  recommendation: string;
}

export function generateEarningsInsights(monthlyGross: number): EarningsInsights {
  const sorted = [...revenueBySubject].sort((a, b) => b.amount - a.amount);
  const total = revenueBySubject.reduce((sum, r) => sum + r.amount, 0);
  const top = sorted[0];
  const topPct = Math.round((top.amount / total) * 100);

  return {
    headline: `This month you earned ${monthlyGross.toLocaleString()} naira in gross bookings.`,
    topSubjectShare: `Your ${top.label} lessons generate ${topPct}% of your income.`,
    busiestTime: "Friday evenings are your busiest time, with the highest booking density of the week.",
    atRiskStudents: "You have 5 students who haven't booked next week's lessons.",
    suggestedAction: "Open two more Friday evening slots to increase your projected monthly earnings by approximately ₦35,000.",
    topRetention: ["Sarah A.", "David O.", "Mary U."],
    recommendation: "Create a WAEC revision group class to increase revenue.",
  };
}

export interface FinancialInsights {
  monthlyEarned: string;
  averageWeekly: string;
  withdrawnThisMonth: string;
  heldInEscrow: string;
  projectedNextWeek: string;
  recommendation: string;
}

export function generateFinancialInsights(params: {
  monthlyGross: number;
  withdrawnThisMonth: number;
  heldInEscrow: number;
  projectedNextWeek: number;
}): FinancialInsights {
  return {
    monthlyEarned: `You've earned ₦${params.monthlyGross.toLocaleString()} this month.`,
    averageWeekly: `Average weekly income: ₦${Math.round(params.monthlyGross / 4).toLocaleString()}.`,
    withdrawnThisMonth: `You withdrew ₦${params.withdrawnThisMonth.toLocaleString()} this month.`,
    heldInEscrow: `Held in escrow: ₦${params.heldInEscrow.toLocaleString()}.`,
    projectedNextWeek: `Projected withdrawable amount next week: ₦${params.projectedNextWeek.toLocaleString()}.`,
    recommendation:
      "Delay your next withdrawal until Friday if you want to receive all currently scheduled lesson payments in one transfer.",
  };
}
