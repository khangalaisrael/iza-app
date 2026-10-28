"use server";

import { cookies } from "next/headers";
import { LANG_COOKIE, isLang } from "@/lib/i18n";

// Remembers the language on this phone for a year. Setting the cookie makes the page redraw in the new language.
export async function setLangAction(form: FormData): Promise<void> {
  const lang = form.get("lang");
  if (!isLang(lang)) return;
  (await cookies()).set(LANG_COOKIE, lang, { path: "/", maxAge: 365 * 24 * 60 * 60, sameSite: "lax" });
}
