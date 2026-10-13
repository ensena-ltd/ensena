import { initialAdminGroupClasses, initialAdminStudents, initialAdminTutors, platformStats } from "@/lib/admin-data";
import {
  computeChurnRisk,
  computeCompatibilityScore,
  computeReadinessScore,
  discoverySessions,
  discoverySessionStats,
} from "@/lib/discovery-sessions-data";
import { formatNaira } from "@/lib/format";

export interface AiInsightCard {
  id: string;
  category: "Intervention" | "High Performer" | "Tutor Quality" | "Growth" | "Counselling";
  title: string;
  detail: string;
  action: string;
  tone: "danger" | "warning" | "success" | "info";
}

export const aiInsightCards: AiInsightCard[] = [
  {
    id: "ai-1",
    category: "Intervention",
    title: "3 students showing dropout risk",
    detail: "Chidera Nwosu, and 2 others have had no lesson activity in over 2 weeks and declining homework completion.",
    action: "Assign a counsellor follow-up",
    tone: "danger",
  },
  {
    id: "ai-2",
    category: "High Performer",
    title: "18 students improving well",
    detail: "Consistent attendance (>90%) and rising homework completion over the last 30 days.",
    action: "Consider a milestone shout-out or badge",
    tone: "success",
  },
  {
    id: "ai-3",
    category: "Tutor Quality",
    title: "Ibrahim Suleiman's rating is declining",
    detail: "Rating dropped from 4.8 to 4.6 over the last month, alongside 2 missed scheduled lessons.",
    action: "Flag for performance review",
    tone: "warning",
  },
  {
    id: "ai-4",
    category: "Tutor Quality",
    title: "Adaeze Okonkwo is an outstanding performer",
    detail: "4.98 rating across 215 reviews with zero late starts in the last 90 days.",
    action: "Feature on homepage",
    tone: "success",
  },
  {
    id: "ai-5",
    category: "Growth",
    title: "WAEC Revision Bootcamp has low enrollment",
    detail: "Only 6 of 12 seats filled with the class starting soon.",
    action: "Promote via targeted announcement",
    tone: "warning",
  },
  {
    id: "ai-6",
    category: "Counselling",
    title: "5 students recommended for counselling",
    detail: "Pattern of cancelled lessons combined with subject difficulty flags in Mathematics and Physics.",
    action: "Suggest booking with Cynthia Ejie",
    tone: "info",
  },
];

export const recommendationFeed = [
  { id: "rec-1", text: "Recommend Adaeze Okonkwo's WAEC Mathematics group class to Sarah A. She's shown strong Maths progress but hasn't booked a group class yet." },
  { id: "rec-2", text: "Grace Emmanuel has missed 2 consecutive JAMB prep sessions: predicted 68% likelihood of churn within 14 days." },
  { id: "rec-3", text: "Suggest Hannah Bassey book a counselling session: study plan review requested but no session booked yet." },
  { id: "rec-4", text: "Faruk Musa (Mathematics, Pending verification) has 4.7 rating from trial sessions. Prioritize verification review." },
];

function keywordMatch(query: string, words: string[]) {
  const q = query.toLowerCase();
  return words.some((w) => q.includes(w));
}

export function answerAdminQuestion(query: string): string {
  const q = query.toLowerCase();

  // Which tutors are performing best?
  if (keywordMatch(q, ["performing best", "best tutors", "top tutors", "top performing"])) {
    const top = [...initialAdminTutors].filter((t) => t.rating > 0).sort((a, b) => b.rating - a.rating || b.earnings - a.earnings).slice(0, 3);
    return `Your top performing tutors are ${top.map((t) => `${t.name} (${t.rating}★, ${formatNaira(t.earnings)} lifetime)`).join(", ")}. All three have zero late starts and strong review counts.`;
  }

  // Student readiness score after a Discovery Session
  if (keywordMatch(q, ["readiness score", "student readiness"])) {
    const completedSessions = discoverySessions.filter((d) => d.status === "Completed");
    const scored = completedSessions.map((d) => ({ student: d.student, score: computeReadinessScore(d) })).sort((a, b) => b.score - a.score);
    if (scored.length === 0) return "No completed Discovery Sessions yet to score for readiness.";
    return `Readiness scores range from ${scored[scored.length - 1].score} to ${scored[0].score}. ${scored[0].student} has the highest readiness score (${scored[0].score}/100) and is a strong candidate to convert into ongoing lessons.`;
  }

  // Tutor compatibility score
  if (keywordMatch(q, ["compatibility score", "tutor compatibility"])) {
    const completedSessions = discoverySessions.filter((d) => d.status === "Completed");
    const scored = completedSessions.map((d) => ({ tutor: d.tutor, student: d.student, score: computeCompatibilityScore(d) })).sort((a, b) => b.score - a.score);
    if (scored.length === 0) return "No completed Discovery Sessions yet to score for compatibility.";
    return `${scored[0].tutor} and ${scored[0].student} show the strongest compatibility score (${scored[0].score}/100) from their Discovery Session. Compatibility scores factor in fit rating and session rating.`;
  }

  // Discovery Session churn risk (checked before the generic dropout branch so "at risk"/"churn" + "discovery" routes here)
  if (keywordMatch(q, ["discovery"]) && keywordMatch(q, ["likelihood of continuing", "risk of churn", "churn risk", "likely to churn", "at risk", "churn"])) {
    const completedSessions = discoverySessions.filter((d) => d.status === "Completed" && !d.continued);
    const highRisk = completedSessions.filter((d) => computeChurnRisk(d) === "High");
    if (highRisk.length === 0) return "No students are currently flagged as high churn risk after their Discovery Session.";
    return `${highRisk.length} student(s) show high churn risk after their Discovery Session: ${highRisk.map((d) => d.student).join(", ")}. Consider a counsellor follow-up or a discount on their next booking.`;
  }

  // Which students are at risk of dropping out?
  if (keywordMatch(q, ["dropout", "drop out", "at risk", "churn"])) {
    return "3 students are flagged with elevated dropout risk based on declining lesson frequency and homework completion: Chidera Nwosu and 2 others have had no lesson activity in over 2 weeks. See the Intervention insight above for details and recommended follow-up.";
  }

  // Which group classes have low attendance?
  if (keywordMatch(q, ["low attendance", "attendance below", "attendance under"])) {
    const low = initialAdminGroupClasses.filter((g) => g.status === "Live" || g.status === "Submitted");
    return `Based on recent session logs, "WAEC Revision Bootcamp" has the weakest attendance among active group classes (only 6 of 12 seats regularly showing up). ${low.length} classes are worth a closer look this week. Check their per-session attendance in the Group Classes page.`;
  }

  // Which tutors have declining ratings?
  if (keywordMatch(q, ["declining rating", "declining ratings", "rating drop", "dropping rating"])) {
    const declining = initialAdminTutors.filter((t) => t.rating > 0 && t.rating < 4.8);
    return `${declining.length} tutor(s) show a declining rating trend: ${declining.map((t) => t.name).join(", ")}. Ibrahim Suleiman in particular dropped from 4.8 to 4.6 over the last month alongside 2 missed scheduled lessons. Recommend flagging for a performance review.`;
  }

  // What revenue is expected this month?
  if (keywordMatch(q, ["revenue is expected", "expected revenue", "revenue forecast", "forecast"])) {
    const projected = Math.round(platformStats.revenueThisMonth * 1.08);
    return `Based on current booking velocity and the last 7 days' growth rate, I'd project total revenue this month to land around ${formatNaira(projected)}, about 8% above the ${formatNaira(platformStats.revenueThisMonth)} recorded so far.`;
  }

  // Which students need counselling?
  if (keywordMatch(q, ["need counselling", "need counseling", "recommend counselling", "recommend counseling"])) {
    return "5 students are recommended for counselling right now, based on a pattern of cancelled lessons combined with subject-difficulty flags in Mathematics and Physics. Suggest booking them with Cynthia Ejie from the Counselling page.";
  }

  // Suggest tutors to feature on the homepage.
  if (keywordMatch(q, ["feature on the homepage", "feature tutors", "suggest tutors to feature", "who should i feature"])) {
    const featured = [...initialAdminTutors].filter((t) => t.rating >= 4.9).sort((a, b) => b.rating - a.rating);
    return `${featured.map((t) => t.name).join(" and ")} would make strong homepage features: both have 4.9+ ratings, zero late starts in the last 90 days, and consistently high review volume.`;
  }

  // Detect suspicious activity or fake reviews.
  if (keywordMatch(q, ["suspicious activity", "fake review", "fake reviews", "detect suspicious", "fraud"])) {
    return "No high-confidence fake-review patterns detected this week. One tutor account (Blessing Nwosu) was banned for fake credentials. Worth double-checking any reviews left before the ban date in case they were coordinated.";
  }

  // Which tutors convert Discovery Sessions into long-term students?
  if (keywordMatch(q, ["convert discovery", "discovery session conversion", "convert discovery sessions"])) {
    const byTutor = new Map<string, { completed: number; continued: number }>();
    for (const d of discoverySessions) {
      if (d.status !== "Completed") continue;
      const cur = byTutor.get(d.tutor) ?? { completed: 0, continued: 0 };
      cur.completed += 1;
      if (d.continued) cur.continued += 1;
      byTutor.set(d.tutor, cur);
    }
    const ranked = [...byTutor.entries()].filter(([, v]) => v.completed > 0).sort((a, b) => b[1].continued / b[1].completed - a[1].continued / a[1].completed);
    const top = ranked[0];
    if (!top) return "Not enough completed Discovery Sessions yet to rank conversion by tutor.";
    return `${top[0]} has the strongest Discovery Session conversion rate (${Math.round((top[1].continued / top[1].completed) * 100)}% of completed sessions turned into ongoing lessons). Overall platform conversion is ${discoverySessionStats.conversionRatePct}%.`;
  }

  // Which Discovery Sessions lead to group class enrolments?
  if (keywordMatch(q, ["discovery sessions lead to group", "lead to group class"])) {
    return "Discovery Sessions currently convert mostly into private lesson packages rather than group classes. Worth testing a follow-up prompt that recommends a relevant group class when a student's schedule suggests they'd prefer a lower-cost option.";
  }

  // Which tutors have poor Discovery Session conversion?
  if (keywordMatch(q, ["poor discovery", "poor conversion", "low discovery session conversion"])) {
    return "Tutors converting below 40% of their Discovery Sessions into ongoing lessons are worth coaching on session structure. Consider sharing the top performer's discovery session format as a template.";
  }

  // Which subjects convert best from Discovery Sessions?
  if (keywordMatch(q, ["subjects convert best", "which subjects convert"])) {
    const bySubject = new Map<string, { completed: number; continued: number }>();
    for (const d of discoverySessions) {
      if (d.status !== "Completed") continue;
      const cur = bySubject.get(d.subject) ?? { completed: 0, continued: 0 };
      cur.completed += 1;
      if (d.continued) cur.continued += 1;
      bySubject.set(d.subject, cur);
    }
    const ranked = [...bySubject.entries()].filter(([, v]) => v.completed > 0).sort((a, b) => b[1].continued / b[1].completed - a[1].continued / a[1].completed);
    const top = ranked[0];
    return top ? `${top[0]} Discovery Sessions convert best right now, at roughly ${Math.round((top[1].continued / top[1].completed) * 100)}%.` : "Not enough completed Discovery Sessions yet to rank by subject.";
  }

  if (keywordMatch(q, ["attendance below", "attendance under"])) {
    const low = initialAdminTutors.filter((t) => t.rating > 0 && t.rating < 4.8);
    return `${low.length} tutors have ratings that suggest attendance concerns worth reviewing: ${low.map((t) => t.name).join(", ")}. I'd recommend checking their recent lesson logs in Tutor Management.`;
  }

  if (keywordMatch(q, ["haven't attended", "havent attended", "inactive student", "missed class", "two weeks"])) {
    const atRisk = initialAdminStudents.filter((s) => s.status !== "Banned").slice(0, 2);
    return `Based on recent activity patterns, ${atRisk.map((s) => s.name).join(" and ")} haven't booked a lesson in over two weeks. Consider assigning a counsellor follow-up from the Students page.`;
  }

  if (keywordMatch(q, ["low enrollment", "low enrolment", "empty seats", "under-filled"])) {
    const low = initialAdminGroupClasses.filter((g) => g.seatsTotal > 0 && g.seatsFilled / g.seatsTotal < 0.6 && g.status !== "Cancelled");
    if (low.length === 0) return "All active group classes currently have healthy enrollment (60%+ seats filled).";
    return `${low.length} group classes have low enrollment: ${low.map((g) => `${g.title} (${g.seatsFilled}/${g.seatsTotal})`).join(", ")}. Consider promoting these via Announcements.`;
  }

  if (keywordMatch(q, ["commission", "how much commission", "platform fee"])) {
    return `Ensena earned approximately ${formatNaira(Math.round(platformStats.revenueThisMonth * 0.15))} in commission this month (15% of ${formatNaira(platformStats.revenueThisMonth)} total revenue).`;
  }

  if (keywordMatch(q, ["highest revenue", "top earning", "most revenue"])) {
    const top = [...initialAdminTutors].sort((a, b) => b.earnings - a.earnings)[0];
    return `${top.name} generated the highest revenue on the platform this period, with ${formatNaira(top.earnings)} in total earnings across ${top.lessonsCompleted} lessons.`;
  }

  if (keywordMatch(q, ["revenue", "how much money", "total earnings"])) {
    return `Total platform revenue this month is ${formatNaira(platformStats.revenueThisMonth)}, up ${platformStats.revenueDelta}% vs last month. ${formatNaira(platformStats.amountInEscrow)} is currently held in escrow.`;
  }

  if (keywordMatch(q, ["pending verification", "waiting for approval", "verification queue"])) {
    const pending = initialAdminTutors.filter((t) => t.verification === "Pending");
    return `${pending.length} tutors are pending verification: ${pending.map((t) => t.name).join(", ")}. Review them from the Verification page.`;
  }

  // Suggested next action / suggested lesson frequency
  if (keywordMatch(q, ["suggested next action", "what should i do next", "next action"])) {
    return "For students who marked their Discovery Session tutor as a good fit but haven't booked a paid lesson within 3 days, the suggested next action is: send a nudge notification pointing them back to \"Book More Sessions\" on their Discovery follow-up page.";
  }

  if (keywordMatch(q, ["suggested lesson frequency", "lesson frequency"])) {
    return "Students who book 2 lessons per week following a Discovery Session are the most likely to continue past their first month.";
  }

  return "I can help with questions about tutor performance and ratings, student dropout risk and counselling needs, group class attendance, revenue forecasts, homepage features, Discovery Session conversion, readiness/compatibility scores, and suspicious activity. Try asking one of the suggested questions below.";
}
