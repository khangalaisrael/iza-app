import { cookies } from "next/headers";
import { LANG_COOKIE, isLang, type Lang } from "./i18n";

// The language this person chose, English until they pick isiXhosa. Reads the request, so call it inside <Suspense>.
export async function getLang(): Promise<Lang> {
  const value = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(value) ? value : "en";
}
