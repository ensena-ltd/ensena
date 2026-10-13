import Link from "next/link";
import { ArrowRight, MessageSquare, Search, Send, UserCheck, Video } from "lucide-react";

const journey = [
  { icon: Search, label: "Student discovers your profile" },
  { icon: Video, label: "Free Discovery Session" },
  { icon: Send, label: "Student sends Pre-approval" },
  { icon: UserCheck, label: "You accept" },
  { icon: MessageSquare, label: "Lesson begins" },
];

const studentIncludes = [
  "Subject",
  "Level",
  "Private or Group",
  "Daily, Weekly or Monthly",
  "Days per week",
  "Any notes or price preference",
];

export function DiscoveryPreapproval() {
  return (
    <section className="mx-auto max-w-[1240px] px-4 py-20 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <div>
          <h2 className="font-heading text-2xl font-semibold leading-tight text-ensena-ink lg:text-3xl">
            Students don&apos;t just book you. They find you.
          </h2>
          <p className="mt-4 text-ensena-muted">
            Students discover your profile, book a free Discovery Session and send a Pre-approval
            request with their needs.
          </p>
          <p className="mt-3 text-ensena-muted">
            You choose to accept, decline or send a special offer.
          </p>
          <Link
            href="/how-it-works"
            className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-ensena-primary hover:underline"
          >
            Learn more about how it works
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="rounded-3xl border border-ensena-border bg-ensena-surface p-6 sm:p-8">
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between sm:gap-1">
            {journey.map((step, i) => (
              <div key={step.label} className="flex items-center gap-2 sm:contents">
                <div className="flex flex-col items-center gap-2 text-center sm:w-24">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary">
                    <step.icon className="size-5" strokeWidth={1.75} />
                  </span>
                  <span className="text-xs font-medium text-ensena-ink">{step.label}</span>
                </div>
                {i < journey.length - 1 && (
                  <ArrowRight className="hidden size-4 shrink-0 text-ensena-border sm:block" aria-hidden="true" />
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl bg-ensena-bg-soft p-4">
            <p className="text-xs font-semibold text-ensena-ink">Students include what they need:</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
              {studentIncludes.map((item) => (
                <span key={item} className="text-xs text-ensena-muted">
                  ✓ {item}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs text-ensena-muted">
              Teachers control the next step. You accept, decline or send a special offer.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
