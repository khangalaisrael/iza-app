// Two languages: English (the default) and isiXhosa. The English sentence is its own key, so a missing
// translation shows the English instead of a blank. {name} in a sentence is filled in from `vars`.
export type Lang = "en" | "xh";

export const LANG_COOKIE = "iza_lang";

export const isLang = (v: unknown): v is Lang => v === "en" || v === "xh";

// Written for review by a first-language speaker. Parcel words are kept as "parcel" because that is what people say.
const xh: Record<string, string> = {
  // The steps of a parcel
  "Booked": "Ibhukishiwe",
  "Picked up": "Ithathiwe",
  "At the Izza point": "Kwindawo ye-Izza",
  "On the way": "Isendleleni",
  "Delivered": "Ifikile",
  "Waiting for a runner": "Silinde umthumeli",
  "Cancelled": "Ikhanseliwe",
  "This parcel was cancelled": "Le parcel ikhanseliwe",
  "Waiting for their address": "Silinde idilesi yabo",
  "Tell us where to bring it": "Sixelele apho sifanele ukuyizisa khona",
  "This parcel is being brought to your door. Tell us exactly where you are.": "Le parcel iza kuzisiwa emnyango wakho. Sixelele ngqo apho ukhoyo.",
  "Pickup: {place}": "Ithathwa ku-{place}",
  "A runner will collect it": "Umthumeli uza kuyithatha",
  "A local runner collected it": "Umthumeli wasekhaya uyithathile",
  "A local runner is carrying it to you": "Umthumeli wasekhaya uyiphethe eyiza kuwe",
  "Show your code at the door": "Nika ikhowudi yakho emnyango",
  "Show your code at the counter": "Nika ikhowudi yakho kwikhawuntari",

  // The headline on a parcel
  "A runner will collect it today": "Umthumeli uza kuyithatha namhlanje",
  "On its way to {point}": "Isendleleni eya ku-{point}",
  "A runner will bring it to your door": "Umthumeli uza kuyizisa emnyango wakho",
  "Ready to collect at {point}": "Ilungele ukuthathwa ku-{point}",
  "It's at {point}. Choose how you want it.": "Ifikile ku-{point}. Khetha indlela ofuna ukuyifumana ngayo.",
  "About 15 minutes": "Malunga nemizuzu eyi-15",
  "Delivered. Enkosi!": "Ifikile. Enkosi!",
  "About {min} min away": "Kusele malunga nemizuzu eyi-{min}",

  // The tracking page
  "Molo, {name}": "Molo, {name}",
  "Share this on WhatsApp": "Yabelana ngale parcel kwi-WhatsApp",
  "Your delivery code": "Ikhowudi yakho yokuhanjiswa",
  "Tell the runner this code at your door. Don't share it before they arrive.":
    "Xelela umthumeli le khowudi emnyango wakho. Ungayabelani nabanye ngaphambi kokuba afike.",
  "Photo from the runner": "Ifoto evela kumthumeli",
  "Payment": "Intlawulo",
  "Sender's fee to the Izza point (R{fee})": "Intlawulo yomthumeli eya kwindawo ye-Izza (R{fee})",
  "Door delivery extra (R{fee}), paid in cash to the runner": "Intlawulo yongezelelo yokuzisa emnyango (R{fee}), ihlawulwa ngemali kumthumeli",
  "Paid": "Ihlawuliwe",
  "Not paid yet": "Ayihlawulwanga",
  "Pay at your door": "Hlawula emnyango wakho",
  "Collecting at the Izza point costs nothing extra.": "Ukuyithatha kwindawo ye-Izza akukho ntlawulo yongezelelo.",
  "Bringing it to {place}": "Iyizisa ku-{place}",
  "Collect at {point}": "Yithathe ku-{point}",
  ", open {hours}": ", ivulwe {hours}",
  "Sign in": "Ngena",
  "to see more about this parcel.": "ukuze ubone okungakumbi ngale parcel.",
  "Updates": "Iindaba",

  // Choosing how to receive it
  "How would you like it?": "Ungathanda ukuyifumana njani?",
  "I'll collect it": "Ndiza kuyithatha",
  "At {point}. Show your code at the counter.": "Ku-{point}. Nika ikhowudi yakho kwikhawuntari.",
  "Bring it to my door": "Yizisele emnyango wam",
  "A local runner brings it. R{fee} extra.": "Umthumeli wasekhaya uyizisa. Ngaphezulu kwe-R{fee}.",
  "Where should we bring it?": "Siyizisa phi?",
  "Describe it like you would to a friend, like the blue gate by the Engen.":
    "Yichaze njengokuba uchazela umhlobo, njengesango eliluhlaza ecaleni kwe-Engen.",
  "e.g. Blue gate opposite the Engen": "umz. Isango eliluhlaza ngaphesheya kwe-Engen",
  "Saved. Thank you!": "Kugcinwe. Enkosi!",
  "Saving…": "Iyagcina…",
  "Save my choice": "Gcina ukhetho lwam",
  "Confirm": "Qinisekisa",

  // The track page and the top bar
  "Where's my parcel?": "Ikuphi iparcel yam?",
  "Type the code from your message.": "Faka ikhowudi evela kumyalezo wakho.",
  "Track": "Landela",
  "Your parcels": "Iiparcel zakho",
  "Loading…": "Iyalayisha…",
  "Nothing yet. Your parcels show up here.": "Akukabikho nto. Iiparcel zakho ziza kubonakala apha.",
  "to see your parcels.": "ukuze ubone iiparcel zakho.",
  "For {name}": "Ka-{name}",
  "Menu": "Imenyu",
  "Find an Izza point": "Fumana indawo ye-Izza",
  "Track a parcel": "Landela iparcel",
  "Dashboard": "Ibhodi",
};

export function t(lang: Lang, english: string, vars?: Record<string, string | number>): string {
  const text = lang === "xh" ? (xh[english] ?? english) : english;
  return vars ? text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`)) : text;
}
