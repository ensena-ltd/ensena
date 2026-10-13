import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

const sidebarItems = ["Overview", "Lessons", "Students", "Messages", "Group Classes", "Earnings", "Settings"];

const upcomingLessons = [
  { name: "Chinedu A.", subject: "Mathematics · SS2", time: "Today, 4:00 PM" },
  { name: "Tunde O.", subject: "Physics · SS1", time: "Tomorrow, 10:00 AM" },
];

const requests = [
  { name: "Sarah K.", subject: "SS2 · Chemistry", time: "Today" },
  { name: "Emmanuel B.", subject: "JAMB · Physics", time: "Yesterday" },
];

export function TeacherDashboardPreview() {
  return (
    <section className="bg-ensena-bg-soft py-20">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <h2 className="font-heading text-2xl font-semibold text-ensena-ink lg:text-3xl">
              Your teaching business, in one place.
            </h2>
            <p className="mt-4 text-ensena-muted">
              Manage your students, lessons, messages, classes and earnings from one dashboard.
              You set your rate and your availability, and track what you earn as you go.
            </p>
            <Button
              nativeButton={false}
              className="mt-6 h-11 rounded-full bg-ensena-primary px-6 text-sm font-semibold text-white hover:bg-ensena-primary/90"
              render={<Link href="/sign-up/tutor" />}
            >
              Explore the dashboard <ArrowRight className="size-4" />
            </Button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-ensena-border bg-ensena-surface shadow-[0_30px_80px_-30px_rgba(17,24,39,0.25)]">
            <div className="flex">
              <div className="hidden w-40 shrink-0 flex-col gap-1 border-r border-ensena-border bg-ensena-bg-soft p-3 sm:flex">
                {sidebarItems.map((item, i) => (
                  <span key={item} className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${i === 0 ? "bg-white text-ensena-primary shadow-sm" : "text-ensena-muted"}`}>
                    {item}
                  </span>
                ))}
              </div>

              <div className="flex-1 p-4 sm:p-5">
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  <div className="rounded-xl border border-ensena-border p-2.5">
                    <p className="text-[10px] text-ensena-muted">Earnings this month</p>
                    <p className="text-sm font-semibold text-ensena-ink">₦245,000</p>
                  </div>
                  <div className="rounded-xl border border-ensena-border p-2.5">
                    <p className="text-[10px] text-ensena-muted">Pre-approval requests</p>
                    <p className="text-sm font-semibold text-ensena-ink">3</p>
                  </div>
                  <div className="rounded-xl border border-ensena-border p-2.5">
                    <p className="text-[10px] text-ensena-muted">Group classes</p>
                    <p className="text-sm font-semibold text-ensena-ink">3 active</p>
                  </div>
                  <div className="rounded-xl border border-ensena-border p-2.5">
                    <p className="text-[10px] text-ensena-muted">Upcoming lessons</p>
                    <p className="text-sm font-semibold text-ensena-ink">{upcomingLessons.length}</p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div className="rounded-xl border border-ensena-border p-3">
                    <p className="text-xs font-semibold text-ensena-ink">Upcoming Lessons</p>
                    <div className="mt-2 flex flex-col gap-2">
                      {upcomingLessons.map((l) => (
                        <div key={l.name} className="flex items-center justify-between text-[11px]">
                          <div>
                            <p className="font-medium text-ensena-ink">{l.name}</p>
                            <p className="text-ensena-muted">{l.subject}</p>
                          </div>
                          <span className="rounded-full border border-ensena-border px-2 py-0.5 text-ensena-muted">{l.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-ensena-border p-3">
                    <p className="text-xs font-semibold text-ensena-ink">Pre-approval Requests</p>
                    <div className="mt-2 flex flex-col gap-2">
                      {requests.map((r) => (
                        <div key={r.name} className="flex items-center justify-between text-[11px]">
                          <div>
                            <p className="font-medium text-ensena-ink">{r.name}</p>
                            <p className="text-ensena-muted">{r.subject}</p>
                          </div>
                          <span className="rounded-full bg-ensena-primary/10 px-2 py-0.5 font-medium text-ensena-primary">{r.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
