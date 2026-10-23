import type { Metadata } from "next"
import { Geist, Geist_Mono, Noto_Sans_SC } from "next/font/google"
import { Suspense } from "react"

import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { I18nProvider } from "@/i18n/provider"
import { getLocale, getT } from "@/i18n/server"

import "./globals.css"

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

/**
 * Last-resort Chinese face for systems without PingFang or Microsoft YaHei
 * (mostly Linux); loaded per glyph range and never preloaded.
 */
const notoSansSC = Noto_Sans_SC({
  variable: "--font-noto-sc",
  weight: ["400", "500", "600", "700"],
  preload: false,
})

/** Every page is titled "Slipway Studio", in both languages. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return {
    title: "Slipway Studio",
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
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${notoSansSC.variable} h-full antialiased`}>
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
