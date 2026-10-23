"use client"

import { useRouter } from "next/navigation"
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

import { LOCALE_COOKIE, LOCALE_TAGS, type Locale } from "./config"
import { getMessages, type Messages } from "./messages"

interface I18nValue {
  locale: Locale
  t: Messages
  setLocale: (locale: Locale) => void
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ locale: initial, children }: { locale: Locale; children: React.ReactNode }) {
  const router = useRouter()
  const [locale, setState] = useState(initial)

  useEffect(() => {
    document.documentElement.lang = LOCALE_TAGS[locale]
  }, [locale])

  const setLocale = useCallback(
    (next: Locale) => {
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
      setState(next)
      // Server components (nav, landing page, titles) read the cookie.
      router.refresh()
    },
    [router],
  )

  const value = useMemo(() => ({ locale, t: getMessages(locale), setLocale }), [locale, setLocale])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

function useI18n(): I18nValue {
  const value = useContext(I18nContext)
  if (!value) throw new Error("useT must be used inside <I18nProvider>")
  return value
}

/** The message dictionary for the current locale. */
export function useT(): Messages {
  return useI18n().t
}

export function useLocale(): [Locale, (locale: Locale) => void] {
  const { locale, setLocale } = useI18n()
  return [locale, setLocale]
}
