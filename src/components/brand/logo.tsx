import Link from "next/link"

import { cn } from "@/lib/utils"

/**
 * The Slipway mark: an inclined slipway (ink), a task block resting on it
 * (signal) at 32.7°, and two waterlines (tide). Same geometry as
 * docs/brand/slipway-mark.svg; the token colors switch with the theme the
 * way the -reverse file does.
 */
export function SlipwayMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn("size-6 shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <g fill="none" strokeLinecap="round">
        <path d="M8 16 L36 34" stroke="var(--ink)" strokeWidth="3.5" />
        <path d="M24 38.5 H42 M16 43 H42" stroke="var(--tide)" strokeWidth="2.5" />
      </g>
      <rect
        x="-5"
        y="-5"
        width="10"
        height="10"
        rx="1.5"
        fill="var(--signal)"
        transform="translate(19.6 15.4) rotate(32.7)"
      />
    </svg>
  )
}

/** Mark plus wordmark, linking home. Mark height is 1.6× the cap height. */
export function SlipwayLogo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center gap-2 rounded-sm font-bold text-ink", className)}
    >
      <SlipwayMark className="size-[1.6em]" />
      <span>Slipway</span>
    </Link>
  )
}
