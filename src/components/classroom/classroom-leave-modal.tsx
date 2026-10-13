import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export function ClassroomLeaveModal({
  open,
  onClose,
  onConfirm,
  confirmLabel,
  onReportProblem,
  title,
  body,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  // Tutor-only, Group classes only: lets the tutor flag that the session
  // itself had a problem (technical issue, couldn't take place, ended
  // early) instead of ending it normally — every enrolled student's
  // allocation is held for Admin review rather than starting the usual 24h
  // window.
  onReportProblem?: () => void;
  /** Overrides the default title/body — used for the Discovery Class's own
   * confirmation copy (which needs to say "the session hasn't reached its
   * scheduled end time yet" rather than the generic group-class wording). */
  title?: string;
  body?: string;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title ?? (confirmLabel ? "End this class?" : "Leave classroom?")}>
      <p className="text-sm text-ensena-muted">{body ?? "You can rejoin this session any time before it ends."}</p>
      <div className="mt-4 flex gap-2">
        <Button variant="outline" onClick={onClose} className="h-10 flex-1 rounded-full border-ensena-border text-sm font-medium">
          Stay
        </Button>
        <Button onClick={onConfirm} className="h-10 flex-1 rounded-full bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700">
          {confirmLabel ?? "Leave Classroom"}
        </Button>
      </div>
      {onReportProblem && (
        <button type="button" onClick={onReportProblem} className="mt-3 w-full text-center text-xs font-medium text-ensena-muted underline decoration-dotted">
          Something went wrong with this session? Report a problem instead
        </button>
      )}
    </Modal>
  );
}
