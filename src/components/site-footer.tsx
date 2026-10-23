import Link from "next/link"

import { SlipwayMark } from "@/components/brand/logo"
import { getT } from "@/i18n/server"

const GITHUB = "https://github.com/slipway-dev/slipway"
const HARBOR_DOCS = "https://harborframework.com/docs"

/** Site footer for every page except the Studio workbench. */
export async function SiteFooter() {
  const t = await getT()
  const columns = [
    {
      title: t.footer.product,
      links: [
        { href: "/studio", label: t.nav.studio, external: false },
        { href: "/runs", label: t.nav.runs, external: false },
      ],
    },
    {
      title: t.footer.resources,
      links: [
        { href: HARBOR_DOCS, label: t.footer.harborDocs, external: true },
        { href: GITHUB, label: t.footer.github, external: true },
      ],
    },
  ]

  return (
    <footer className="mt-auto border-t border-line bg-surface-sunken">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 md:grid-cols-[minmax(0,1fr)_auto] md:px-8">
        <div className="flex max-w-sm flex-col gap-4">
          <Link href="/" className="flex w-fit items-center gap-2.5 rounded-md text-title font-semibold">
            <SlipwayMark className="size-7" />
            Slipway
          </Link>
          <p className="text-body-sm text-ink-muted">{t.footer.disclaimer}</p>
        </div>
        <nav aria-label={t.footer.resources} className="flex gap-16">
          {columns.map((column) => (
            <div key={column.title} className="flex flex-col gap-3">
              <h2 className="text-body-sm font-semibold">{column.title}</h2>
              <ul className="flex flex-col gap-2.5 text-body-sm text-ink-muted">
                {column.links.map((link) => (
                  <li key={link.href}>
                    {link.external ? (
                      <a href={link.href} className="hover:text-ink" target="_blank" rel="noreferrer">
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href} className="hover:text-ink">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-body-sm text-ink-muted md:px-8">
          <span>Slipway</span>
          <span>
            {t.footer.createdBy} <span className="font-medium text-ink">Yiming Shen</span>
          </span>
        </div>
      </div>
    </footer>
  )
}
