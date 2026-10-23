import type { Metadata } from "next"
import { JetBrains_Mono, Noto_Sans_SC, Schibsted_Grotesk } from "next/font/google"
import { Suspense } from "react"

import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { I18nProvider } from "@/i18n/provider"
import { getLocale, getT } from "@/i18n/server"

import "./globals.css"

const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
})

/** Chinese fallback for the sans family; loaded per glyph range, so English pages fetch none of it. */
const notoSansSC = Noto_Sans_SC({
  variable: "--font-noto-sc",
  weight: ["400", "600", "700"],
  preload: false,
})

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
})

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return {
    title: { default: t.meta.title, template: "%s — Slipway" },
    description: t.meta.description,
  }
}

/**
 * The locale comes from a cookie or Accept-Language, which is request-time
 * data, so everything below <html> streams inside one Suspense boundary.
 */
async function Localized({ children }: { children: React.ReactNode }) {
  return <I18nProvider locale={await getLocale()}>{children}</I18nProvider>
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${schibsted.variable} ${notoSansSC.variable} ${jetbrains.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Suspense>
          <Localized>
            <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
            <Toaster />
          </Localized>
        </Suspense>
      </body>
    </html>
  )
}
