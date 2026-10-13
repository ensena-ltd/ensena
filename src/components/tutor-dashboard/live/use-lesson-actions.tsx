"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { cancelLessonAsTutor, markLessonCompleted, rescheduleLessonAsTutor } from "@/lib/actions/tutor-teaching";
import type { TeachingLesson } from "@/lib/tutor-teaching-server";

import { fullWhen, ReasonModal, RescheduleModal } from "./teaching-shared";

/** Cancel / reschedule / mark-complete for private lessons, plus their dialogs. */
export function useLessonActions() {
  const router = useRouter();
  const [cancelling, setCancelling] = useState<TeachingLesson | null>(null);
  const [rescheduling, setRescheduling] = useState<TeachingLesson | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function complete(lesson: TeachingLesson) {
    setCompletingId(lesson.id);
    startTransition(async () => {
      const result = await markLessonCompleted(lesson.id);
      setCompletingId(null);
      if (!result.ok) {
        toast.error(result.message ?? "We couldn't mark this lesson complete.");
        return;
      }
      toast.success(`Marked complete. ${lesson.studentName.split(" ")[0]} has 24 hours to confirm or report a problem.`);
      router.refresh();
    });
  }

  const modals = (
    <>
      <ReasonModal
        open={!!cancelling}
        title="Cancel this lesson?"
        description={
          cancelling && (
            <>
              {cancelling.subject} with {cancelling.studentName} on {fullWhen(cancelling.startMs)}. {cancelling.studentName.split(" ")[0]} will be notified
              {cancelling.paymentStatus === "paid" ? " and is owed a full refund." : "."} Frequent cancellations affect your profile.
            </>
          )
        }
        confirmLabel="Cancel lesson"
        placeholder="Reason (your student will see this)"
        onClose={() => setCancelling(null)}
        onConfirm={async (reason) => {
          if (!cancelling) return false;
          const result = await cancelLessonAsTutor(cancelling.id, reason);
          if (!result.ok) {
            toast.error(result.message ?? "We couldn't cancel this lesson.");
            return false;
          }
          toast.success("Lesson cancelled and your student has been told.");
          router.refresh();
          return true;
        }}
      />
      <RescheduleModal
        lesson={rescheduling}
        onClose={() => setRescheduling(null)}
        onConfirm={async (newStartMs, note) => {
          if (!rescheduling) return false;
          const result = await rescheduleLessonAsTutor(rescheduling.id, newStartMs, note);
          if (!result.ok) {
            toast.error(result.message ?? "We couldn't move this lesson.");
            return false;
          }
          toast.success(`Lesson moved to ${fullWhen(newStartMs)}. Your student has been told.`);
          router.refresh();
          return true;
        }}
      />
    </>
  );

  return { cancel: setCancelling, reschedule: setRescheduling, complete, completingId, modals };
}
