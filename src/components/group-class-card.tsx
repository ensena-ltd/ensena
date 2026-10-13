import Link from "next/link";
import { Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/format";
import type { GroupClass } from "@/lib/data";

export function GroupClassCard({ groupClass }: { groupClass: GroupClass }) {
  const Icon = groupClass.icon;
  const seatsLeft = groupClass.maxSeats - groupClass.enrolled;
  const bookingHref = `/group-classes/${groupClass.slug}`;

  return (
    <article className="flex w-72 shrink-0 flex-col gap-4 rounded-2xl border border-ensena-border bg-ensena-surface p-6 transition-all hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-center justify-between">
        <span className="flex size-11 items-center justify-center rounded-xl bg-ensena-bg-soft text-ensena-primary">
          <Icon className="size-5" strokeWidth={1.75} />
        </span>
        <span className="text-xs font-medium text-ensena-muted">
          {groupClass.schedule}
        </span>
      </div>

      <div>
        <h3 className="line-clamp-2 font-heading text-base font-semibold text-ensena-ink">
          {groupClass.name}
        </h3>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-ensena-muted">
          <Users className="size-3.5" />
          <span>
            {seatsLeft} of {groupClass.maxSeats} spots available
          </span>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between pt-1">
        <p className="text-sm font-semibold text-ensena-ink">
          {formatNaira(groupClass.price)}{" "}
          <span className="font-normal text-ensena-muted">/ session</span>
        </p>
      </div>
      <Button
        nativeButton={false}
        render={<Link href={bookingHref} />}
        className="h-10 w-full rounded-full bg-ensena-primary text-sm font-medium text-white transition-transform hover:-translate-y-0.5 hover:bg-ensena-primary-hover"
      >
        Book Group Class
      </Button>
    </article>
  );
}
