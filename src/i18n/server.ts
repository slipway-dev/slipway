import { cookies, headers } from "next/headers"

import { isLocale, LOCALE_COOKIE, negotiateLocale, type Locale } from "./config"
import { getMessages, type Messages } from "./messages"

/** The visitor's locale: their saved choice, else their browser's languages. Request-time data. */
export async function getLocale(): Promise<Locale> {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value
  if (isLocale(saved)) return saved
  return negotiateLocale((await headers()).get("accept-language"))
}

export async function getT(): Promise<Messages> {
  return getMessages(await getLocale())
}
