"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import { ClassListPageShell } from "@/components/student-dashboard/lessons/class-list-page-shell";
import type { ClassListItem } from "@/components/student-dashboard/lessons/class-list-row";
import { buildBookingReference } from "@/lib/booking-reference";
import { buildActivePrivateArrangements, parseDateTimeMs } from "@/lib/class-list-helpers";
import { useNowMs } from "@/hooks/use-now-ms";
import { studentGroupClasses, studentLessons } from "@/lib/student-dashboard-data";

// Every row's "View Class" hands off to the same shared Class Details page
// used by Upcoming and Completed (/student-dashboard/lessons/class/[id])
// — private lessons route via their next lesson's real id, group classes
// keep going to their existing enrolled-class page.
export function ActiveClassesClient() {
  const router = useRouter();

  function messageTutor(name: string) {
    router.push(`/student-dashboard/messages?tutor=${encodeURIComponent(name)}`);
  }

  const nowMs = useNowMs();
  const activePrivate = useMemo(() => buildActivePrivateArrangements(studentLessons, nowMs), [nowMs]);

  const items: ClassListItem[] = [
    ...activePrivate.map((arr) => ({
      id: `private-${arr.key}`,
      kind: "Private Lesson" as const,
      title: arr.subject,
      tutor: arr.tutor,
      tutorImage: arr.tutorImage,
      dateLabel: `${arr.sessionsPerWeek} sessions/week`,
      timeLabel: `${arr.days} · ${arr.time}`,
      sortTime: parseDateTimeMs(arr.nextLesson.date, arr.nextLesson.time),
      extraLine: `Next lesson: ${arr.nextLabel}`,
      bookingIdLabel: "Booking ID" as const,
      bookingId: buildBookingReference("private", arr.nextLesson.id),
      actionLabel: "View Class",
      actionHref: `/student-dashboard/lessons/class/${arr.nextLesson.id}`,
      onKebab: () => messageTutor(arr.tutor),
    })),
    ...studentGroupClasses.map((cls) => {
      const [datePart, timePart] = cls.nextClass.split(", ");
      return {
        id: `group-${cls.id}`,
        kind: "Group Class" as const,
        title: cls.title,
        tutor: cls.tutor,
        tutorImage: "/teacher-1.jpg.png",
        dateLabel: cls.schedule,
        timeLabel: `Next class: ${cls.nextClass}`,
        sortTime: parseDateTimeMs(datePart, timePart),
        extraLine: `${cls.seatsFilled} / ${cls.seatsTotal} students`,
        bookingIdLabel: "Class ID" as const,
        bookingId: buildBookingReference("group", cls.id),
        actionLabel: "View Class",
        actionHref: `/student-dashboard/group-classes/${cls.id}`,
        onKebab: () => messageTutor(cls.tutor),
      };
    }),
  ];

  return (
    <ClassListPageShell
      title="Active Classes"
      subtitle="All your ongoing private lessons and group classes."
      kinds={["Private Lesson", "Group Class"]}
      items={items}
      emptyLabel="No active classes right now."
    />
  );
}
