import { birthdayBannerMessage } from "@/lib/birthday-data";

export function BirthdayDashboardBanner({
  firstName,
  onOpenShare,
}: {
  firstName: string;
  onOpenShare: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-ensena-primary/10 to-[#CBEFFF]/40 px-4 py-3">
      <p className="text-sm font-medium text-ensena-ink">{birthdayBannerMessage(firstName)}</p>
      <button
        type="button"
        onClick={onOpenShare}
        className="text-xs font-semibold text-ensena-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-ensena-primary"
      >
        Share your birthday card →
      </button>
    </div>
  );
}
