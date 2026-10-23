import Link from "next/link"

import { SlipwayLogo } from "@/components/brand/logo"
import { LocaleSwitch } from "@/components/locale-switch"
import { getT } from "@/i18n/server"
import { cn } from "@/lib/utils"

/** Top bar for every page except the Studio workbench, which has its own. */
export async function SiteNav({ current }: { current?: "/studio" | "/runs" }) {
  const t = await getT()
  const links = [
    { href: "/studio", label: t.nav.studio },
    { href: "/runs", label: t.nav.runs },
  ] as const
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-8 px-4 md:px-8">
        <SlipwayLogo />
        <nav aria-label={t.nav.main} className="flex items-center gap-1 text-body-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={current === link.href ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-1.5 text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink",
                current === link.href && "bg-surface-sunken font-medium text-ink",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <a
            href="https://harborframework.com/docs"
            className="hidden text-body-sm text-ink-muted hover:text-ink sm:inline"
          >
            {t.nav.harborDocs}
          </a>
          <LocaleSwitch />
        </div>
      </div>
    </header>
  )
}
