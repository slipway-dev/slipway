import Link from "next/link"

import { SlipwayLogo } from "@/components/brand/logo"
import { cn } from "@/lib/utils"

const LINKS = [
  { href: "/studio", label: "Studio" },
  { href: "/runs", label: "Runs" },
]

export function SiteNav({ current }: { current?: "/studio" | "/runs" }) {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center gap-6 px-4 py-4">
      <SlipwayLogo />
      <nav aria-label="Main" className="flex items-center gap-4 text-body-sm">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={current === link.href ? "page" : undefined}
            className={cn(
              "rounded-sm text-ink-muted hover:text-ink",
              current === link.href && "font-semibold text-ink",
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <a
        href="https://harborframework.com/docs"
        className="ml-auto text-body-sm text-tide underline-offset-4 hover:underline"
      >
        Harbor docs
      </a>
    </header>
  )
}
