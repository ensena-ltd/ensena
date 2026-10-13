"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, MessageSquare, Video } from "lucide-react";

import { ClassListPageShell } from "@/components/student-dashboard/lessons/class-list-page-shell";
import type { ClassListItem } from "@/components/student-dashboard/lessons/class-list-row";
import { ManageLessonSheet } from "@/components/shared/manage-lesson/manage-lesson-sheet";
import { useAllDiscoverySessions } from "@/hooks/use-discovery-sessions";
import { useNowMs } from "@/hooks/use-now-ms";
import { buildBookingReference } from "@/lib/booking-reference";
import { parseDateTimeMs, startsInLabel } from "@/lib/class-list-helpers";
import { canEnterClassroom, getClassEntryState } from "@/lib/class-entry-access";
import { getDiscoverySessionTimeRange } from "@/lib/discovery-sessions-data";
import type { ManageLessonAction, ManageLessonData } from "@/lib/manage-lesson-types";
import { getPrivateLessonTimeRange, studentGroupClasses, studentLessons } from "@/lib/student-dashboard-data";

// Same "Sarah Johnson" convention already used by learning-journey-card.tsx
// and student-discovery-sessions-client.tsx for this data source — see the
// note in my-lessons-client.tsx for why this differs from dashboardStudent.
const DISCOVERY_STUDENT_NAME = "Sarah Johnson";

export function UpcomingClassesClient() {
  const router = useRouter();
  const discoverySessions = useAllDiscoverySessions();
  const nowMs = useNowMs();
  // Keyed by the same prefixed ClassListItem.id ("private-pl-1", "group-gc-1",
  // "discovery-ds-1") so one piece of state can open the right kind's menu —
  // avoids three separate useState calls for what's really one interaction.
  const [manageItemId, setManageItemId] = useState<string | null>(null);

  function messageTutor(name: string) {
    router.push(`/student-dashboard/messages?tutor=${encodeURIComponent(name)}`);
  }

  const items: ClassListItem[] = [];

  studentLessons
    .filter((l) => l.type === "Private" && (l.status === "Upcoming" || l.status === "Rescheduled"))
    .forEach((l) => {
      items.push({
        id: `private-${l.id}`,
        kind: "Private Lesson",
        title: l.subject,
        tutor: l.tutor,
        tutorImage: l.tutorImage,
        dateLabel: l.date,
        timeLabel: `${l.time} · ${l.duration}`,
        sortTime: parseDateTimeMs(l.date, l.time),
        startsInLabel: startsInLabel(l.date),
        detailsHref: `/student-dashboard/lessons/class/${l.id}`,
        bookingIdLabel: "Booking ID",
        bookingId: buildBookingReference("private", l.id),
        actionLabel: "Enter Classroom",
        ...(l.status === "Upcoming"
          ? {
              actionHref: `/student-dashboard/classroom/private/${l.id}`,
              actionDisabled: !canEnterClassroom(getClassEntryState({ ...getPrivateLessonTimeRange(l), role: "student", nowMs })),
            }
          : { actionDisabled: true }),
        onKebab: () => setManageItemId(`private-${l.id}`),
      });
    });

  studentGroupClasses.forEach((cls) => {
    const [datePart, timePart] = cls.nextClass.split(", ");
    items.push({
      id: `group-${cls.id}`,
      kind: "Group Class",
      title: cls.title,
      tutor: cls.tutor,
      tutorImage: "/teacher-1.jpg.png",
      dateLabel: datePart,
      timeLabel: timePart ?? cls.schedule,
      sortTime: parseDateTimeMs(datePart, timePart),
      startsInLabel: startsInLabel(datePart),
      extraLine: `${cls.seatsFilled} / ${cls.seatsTotal} students`,
      detailsHref: `/student-dashboard/group-classes/${cls.id}`,
      bookingIdLabel: "Class ID",
      bookingId: buildBookingReference("group", cls.id),
      actionLabel: "View Class",
      actionHref: `/student-dashboard/group-classes/${cls.id}`,
      onKebab: () => setManageItemId(`group-${cls.id}`),
    });
  });

  discoverySessions
    .filter((d) => d.student === DISCOVERY_STUDENT_NAME && d.status === "Upcoming")
    .forEach((d) => {
      items.push({
        id: `discovery-${d.id}`,
        kind: "Discovery Session",
        title: "Discovery Session",
        tutor: d.tutor,
        tutorImage: d.tutorImage,
        dateLabel: d.date,
        timeLabel: `${d.time} · ${d.durationMins} min`,
        sortTime: parseDateTimeMs(d.date, d.time),
        startsInLabel: startsInLabel(d.date),
        extraLine: d.subject,
        detailsHref: `/student-dashboard/lessons/class/${d.id}`,
        bookingIdLabel: "Booking ID",
        bookingId: d.bookingReference,
        actionLabel: "Enter Classroom",
        actionHref: `/student-dashboard/discovery-sessions/${d.id}/classroom`,
        actionDisabled: !canEnterClassroom(getClassEntryState({ ...getDiscoverySessionTimeRange(d), role: "student", nowMs })),
        onKebab: () => setManageItemId(`discovery-${d.id}`),
      });
    });

  // The kebab menu is deliberately just View Class + Message Teacher here —
  // "Enter Classroom"/"View Class" is already this row's own primary action
  // (duplicating it in the menu would be redundant), and "Report a Problem"
  // only makes sense once a class has actually happened (see
  // completed-classes-client.tsx, which has real escrow/support records to
  // attach a report to — nothing has occurred yet for an upcoming class).
  function buildManageData(itemId: string): ManageLessonData | null {
    const [kind, ...rest] = itemId.split("-");
    const rawId = rest.join("-");
    if (kind === "private") {
      const l = studentLessons.find((x) => x.id === rawId);
      if (!l) return null;
      return { sheetTitle: "Manage Lesson", title: l.subject, subtitle: l.tutor, image: l.tutorImage, statusLabel: l.status, bookingRef: buildBookingReference("private", l.id), infoRows: [{ label: "Date", value: l.date }, { label: "Time", value: l.time }] };
    }
    if (kind === "group") {
      const cls = studentGroupClasses.find((x) => x.id === rawId);
      if (!cls) return null;
      return { sheetTitle: "Manage Class", title: cls.title, subtitle: cls.tutor, image: cls.tutorImage, statusLabel: "Enrolled", bookingRef: buildBookingReference("group", cls.id), infoRows: [{ label: "Schedule", value: cls.schedule }] };
    }
    const d = discoverySessions.find((x) => x.id === rawId);
    if (!d) return null;
    return { sheetTitle: "Manage Discovery Session", title: "Discovery Session", subtitle: d.tutor, image: d.tutorImage, statusLabel: d.status, bookingRef: d.bookingReference, infoRows: [{ label: "Date", value: d.date }, { label: "Time", value: d.time }] };
  }

  function buildManageActions(itemId: string): ManageLessonAction[] {
    const [kind, ...rest] = itemId.split("-");
    const rawId = rest.join("-");
    const actions: ManageLessonAction[] = [];
    if (kind === "private") {
      const l = studentLessons.find((x) => x.id === rawId);
      if (!l) return actions;
      actions.push({ key: "view", label: "View Class", icon: Calendar, onClick: () => { setManageItemId(null); router.push(`/student-dashboard/lessons/class/${l.id}`); } });
      actions.push({ key: "message", label: "Message Teacher", icon: MessageSquare, onClick: () => { setManageItemId(null); messageTutor(l.tutor); } });
    } else if (kind === "group") {
      const cls = studentGroupClasses.find((x) => x.id === rawId);
      if (!cls) return actions;
      actions.push({ key: "view", label: "View Class", icon: Calendar, onClick: () => { setManageItemId(null); router.push(`/student-dashboard/group-classes/${cls.id}`); } });
      actions.push({ key: "message", label: "Message Teacher", icon: MessageSquare, onClick: () => { setManageItemId(null); messageTutor(cls.tutor); } });
    } else {
      const d = discoverySessions.find((x) => x.id === rawId);
      if (!d) return actions;
      actions.push({ key: "view", label: "View Class", icon: Calendar, onClick: () => { setManageItemId(null); router.push(`/student-dashboard/lessons/class/${d.id}`); } });
      actions.push({ key: "message", label: "Message Teacher", icon: MessageSquare, onClick: () => { setManageItemId(null); messageTutor(d.tutor); } });
      if (canEnterClassroom(getClassEntryState({ ...getDiscoverySessionTimeRange(d), role: "student", nowMs }))) {
        actions.unshift({ key: "join", label: "Join classroom", icon: Video, variant: "primary", onClick: () => { setManageItemId(null); router.push(`/student-dashboard/discovery-sessions/${d.id}/classroom`); } });
      }
    }
    return actions;
  }

  return (
    <>
      <ClassListPageShell
        title="Upcoming Classes"
        subtitle="All your upcoming lessons and classes in one place."
        kinds={["Private Lesson", "Group Class", "Discovery Session"]}
        items={items}
        emptyLabel="Nothing scheduled yet."
      />
      <ManageLessonSheet
        open={manageItemId !== null}
        data={manageItemId ? buildManageData(manageItemId) : null}
        actions={manageItemId ? buildManageActions(manageItemId) : []}
        onClose={() => setManageItemId(null)}
      />
    </>
  );
}
