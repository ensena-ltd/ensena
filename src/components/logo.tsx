import Image from "next/image";

import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Force the compact circular mark only (loading screens, avatar placeholders, notifications, collapsed sidebars). */
  iconOnly?: boolean;
  /** Force the full wordmark lockup even on a narrow viewport — the default responsive icon/wordmark switch below is meant for wide navs that would otherwise crowd; a few reference screens (e.g. the Private Class mobile Video header) show the full lockup on a phone-sized screen deliberately. */
  horizontal?: boolean;
  /** Pixel height of the mark. Horizontal lockup width scales proportionally. */
  size?: number;
}

const ICON_ASPECT = 1;
const HORIZONTAL_ASPECT = 2172 / 724;

export function Logo({ className, iconOnly = false, horizontal = false, size = 32 }: LogoProps) {
  if (iconOnly) {
    return (
      <Image
        src="/brand/icon.svg"
        alt="Ensena"
        width={size}
        height={size / ICON_ASPECT}
        priority
        className={cn("shrink-0", className)}
      />
    );
  }

  if (horizontal) {
    return (
      <Image
        src="/brand/logo-horizontal.png"
        alt="Ensena"
        width={Math.round(size * HORIZONTAL_ASPECT)}
        height={size}
        priority
        className={cn("shrink-0", className)}
      />
    );
  }

  return (
    <span className={cn("inline-flex items-center", className)}>
      {/* Compact mark on narrow viewports where the full wordmark would crowd the nav. */}
      <Image
        src="/brand/icon.svg"
        alt="Ensena"
        width={size}
        height={size}
        priority
        className="shrink-0 sm:hidden"
      />
      <Image
        src="/brand/logo-horizontal.png"
        alt="Ensena"
        width={Math.round(size * HORIZONTAL_ASPECT)}
        height={size}
        priority
        className="hidden shrink-0 sm:block"
      />
    </span>
  );
}
