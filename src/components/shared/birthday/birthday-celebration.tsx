"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BirthdayCard } from "@/components/shared/birthday/birthday-card";
import { BirthdayDashboardBanner } from "@/components/shared/birthday/birthday-dashboard-banner";
import { BirthdayShareModal } from "@/components/shared/birthday/birthday-share-modal";
import { hasSeenBirthdayPopupThisYear, markBirthdayPopupSeen, type BirthdayRole } from "@/lib/birthday-data";
import { isBirthdayToday } from "@/lib/milestones-data";

export function BirthdayCelebration({
  firstName,
  role,
  dob,
}: {
  firstName: string;
  role: BirthdayRole;
  dob: string;
}) {
  const todaysBirthday = isBirthdayToday(dob);
  const [modalOpen, setModalOpen] = useState(() => todaysBirthday && !hasSeenBirthdayPopupThisYear(role));
  const [showBanner, setShowBanner] = useState(() => todaysBirthday && hasSeenBirthdayPopupThisYear(role));
  const [shareOpen, setShareOpen] = useState(false);

  const data = { firstName, role };

  function closeModal() {
    setModalOpen(false);
    markBirthdayPopupSeen(role);
    setShowBanner(true);
  }

  return (
    <>
      {showBanner && (
        <div className="mt-6">
          <BirthdayDashboardBanner firstName={firstName} onOpenShare={() => setShareOpen(true)} />
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-6" role="dialog" aria-modal="true" aria-label={`Happy Birthday, ${firstName}`}>
          <div className="w-full max-w-md">
            <BirthdayCard {...data} variant="modal" />
            <div className="mt-4 flex flex-col gap-2.5">
              <Button onClick={closeModal} className="h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
                Continue to Dashboard
              </Button>
              <button
                type="button"
                onClick={() => setShareOpen(true)}
                className="flex h-11 w-full items-center justify-center gap-1.5 rounded-full border border-ensena-border bg-ensena-surface text-sm font-semibold text-ensena-ink hover:bg-ensena-bg-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-ensena-primary"
              >
                <Share2 className="size-4" /> Share your birthday card
              </button>
            </div>
          </div>
        </div>
      )}

      <BirthdayShareModal open={shareOpen} data={data} onClose={() => setShareOpen(false)} />
    </>
  );
}
