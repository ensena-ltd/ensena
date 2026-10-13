import Image from "next/image";
import { BadgeCheck, GraduationCap, ShieldCheck, Star, UserCheck } from "lucide-react";

const trustIndicators = [
  { icon: UserCheck, label: "Identity Verified" },
  { icon: GraduationCap, label: "Education Verified" },
  { icon: BadgeCheck, label: "Subject Expertise" },
  { icon: Star, label: "Student Reviews" },
];

export function TeacherProfileTrust() {
  return (
    <section className="mx-auto max-w-[1240px] px-4 py-20 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <div>
          <h2 className="font-heading text-2xl font-semibold text-ensena-ink lg:text-3xl">
            Let students discover what you do best.
          </h2>
          <p className="mt-4 text-ensena-muted">
            A strong profile helps students choose the right tutor.
          </p>
        </div>

        <div className="mx-auto w-full max-w-sm rounded-3xl border border-ensena-border bg-ensena-surface p-5 shadow-[0_20px_60px_-30px_rgba(17,24,39,0.25)]">
          <div className="flex items-center gap-3">
            <div className="relative size-14 shrink-0 overflow-hidden rounded-full">
              <Image src="/teacher-2.jpg.png" alt="Adaeze, a Mathematics tutor on Ensena" fill sizes="56px" className="object-cover" />
              <span className="absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-white bg-ensena-success" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <p className="text-sm font-semibold text-ensena-ink">Adaeze C.</p>
                <BadgeCheck className="size-4 text-ensena-primary" />
              </div>
              <p className="text-xs text-ensena-muted">Mathematics Tutor</p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3 text-xs text-ensena-muted">
            <span className="flex items-center gap-1 text-ensena-ink"><Star className="size-3.5 fill-amber-400 text-amber-400" /> 4.9 (105 reviews)</span>
            <span>6+ years experience</span>
          </div>

          <p className="mt-2 text-xs text-ensena-muted">WAEC · JAMB · SS1 – SS3</p>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-base font-semibold text-ensena-ink">₦3,500 <span className="text-xs font-normal text-ensena-muted">/ hour</span></p>
            <span className="flex items-center gap-1 text-xs font-medium text-ensena-success">
              <span className="size-1.5 rounded-full bg-ensena-success" /> Available Today
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {["Discovery Session", "Private Lessons", "Group Classes"].map((tag) => (
              <span key={tag} className="rounded-full bg-ensena-bg-soft px-2.5 py-1 text-[11px] font-medium text-ensena-ink">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-16 text-center">
        <h3 className="font-heading text-2xl font-semibold text-ensena-ink lg:text-3xl">Your expertise matters.</h3>
        <p className="mx-auto mt-3 max-w-md text-ensena-muted">
          Build trust with students through a verified profile and clear credentials.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          {trustIndicators.map((item) => (
            <span key={item.label} className="flex items-center gap-2 text-sm font-medium text-ensena-ink">
              <item.icon className="size-4.5 text-ensena-primary" strokeWidth={1.75} />
              {item.label}
            </span>
          ))}
        </div>

        <p className="mx-auto mt-6 flex max-w-lg items-center justify-center gap-1.5 text-xs text-ensena-muted">
          <ShieldCheck className="size-3.5 shrink-0" />
          Masters and PhD tutoring requires a verified Master&apos;s or PhD qualification, completed or in progress.
        </p>
      </div>
    </section>
  );
}
