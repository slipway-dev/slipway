"use client"

import { LOCALES, type Locale } from "@/i18n/config"
import { useLocale, useT } from "@/i18n/provider"
import { cn } from "@/lib/utils"

const NAMES: Record<Locale, string> = { en: "EN", zh: "中文" }
const FULL: Record<Locale, string> = { en: "English", zh: "简体中文" }

/** Two-way language toggle. Names are written in their own language, never translated. */
export function LocaleSwitch({ tone = "paper", className }: { tone?: "paper" | "hull"; className?: string }) {
  const [locale, setLocale] = useLocale()
  const t = useT()
  return (
    <div
      role="radiogroup"
      aria-label={t.nav.language}
      className={cn(
        "inline-flex shrink-0 rounded-sm border p-0.5 text-label",
        tone === "paper" ? "border-line bg-surface" : "border-white/15",
        className,
      )}
    >
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={l === locale}
          lang={l === "zh" ? "zh-CN" : "en"}
          title={FULL[l]}
          onClick={() => l !== locale && setLocale(l)}
          className={cn(
            "rounded-[3px] px-2 py-0.5 font-semibold transition-colors",
            l === locale
              ? tone === "paper"
                ? "bg-ink text-paper"
                : "bg-hull-ink text-hull"
              : tone === "paper"
                ? "text-ink-muted hover:text-ink"
                : "text-hull-muted hover:text-hull-ink",
          )}
        >
          {NAMES[l]}
        </button>
      ))}
    </div>
  )
}
