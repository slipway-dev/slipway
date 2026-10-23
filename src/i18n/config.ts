export const LOCALES = ["en", "zh"] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = "en"
export const LOCALE_COOKIE = "slipway-locale"

/** BCP 47 tag for <html lang> and Intl formatters. */
export const LOCALE_TAGS: Record<Locale, string> = { en: "en", zh: "zh-CN" }

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value)
}

/** Picks a locale from an Accept-Language header, honoring q-values. */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE
  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().toLowerCase().split(";")
      const q = params.find((p) => p.trim().startsWith("q="))
      return { tag, q: q ? Number(q.trim().slice(2)) || 0 : 1 }
    })
    .filter((entry) => entry.tag && entry.q > 0)
    .sort((a, b) => b.q - a.q)
  for (const { tag } of ranked) {
    const base = tag.split("-")[0]
    if (isLocale(base)) return base
  }
  return DEFAULT_LOCALE
}
