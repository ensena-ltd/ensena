"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { AdminBookingsClient } from "@/components/admin/admin-bookings-client";
import { AdminGroupClassesClient } from "@/components/admin/admin-group-classes-client";
import { AdminLessonConfirmationsClient } from "@/components/admin/lesson-confirmations-client";
import { AdminStudentsClient } from "@/components/admin/admin-students-client";
import { AdminTutorsClient } from "@/components/admin/admin-tutors-client";
import { AdminWithdrawalsClient } from "@/components/admin/admin-withdrawals-client";
import { cn } from "@/lib/utils";

// NOTE: this deliberately uses `panel` (not `tab`/`status`/`verification`/`risk`)
// as its query param — those names are already used internally by the six
// components below for their own filtering, on the same URL.
type Panel = "Students" | "Tutors" | "Bookings" | "Group Classes" | "Escrow" | "Withdrawals";
const panels: Panel[] = ["Students", "Tutors", "Bookings", "Group Classes", "Escrow", "Withdrawals"];

export function AdminManagementClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const panelParam = searchParams.get("panel");
  const panel: Panel = panels.includes(panelParam as Panel) ? (panelParam as Panel) : "Students";

  function setPanel(next: Panel) {
    router.replace(`${pathname}?panel=${encodeURIComponent(next)}`, { scroll: false });
  }

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Management</h1>
        <p className="mt-1 text-sm text-ensena-muted">Students, tutors, bookings, group classes, escrow and withdrawals, all in one place.</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-1 overflow-x-auto rounded-full bg-ensena-bg-soft p-1 text-sm">
        {panels.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPanel(p)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 font-medium transition-colors",
              panel === p ? "bg-white text-ensena-primary shadow-sm" : "text-ensena-muted hover:text-ensena-ink"
            )}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {panel === "Students" && <AdminStudentsClient />}
        {panel === "Tutors" && <AdminTutorsClient />}
        {panel === "Bookings" && <AdminBookingsClient />}
        {panel === "Group Classes" && <AdminGroupClassesClient />}
        {panel === "Escrow" && <AdminLessonConfirmationsClient />}
        {panel === "Withdrawals" && <AdminWithdrawalsClient />}
      </div>
    </div>
  );
}
