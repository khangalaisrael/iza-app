import Link from "next/link";
import { Suspense } from "react";
import CodeForm from "@/components/CodeForm";
import LanguageLinks from "@/components/LanguageLinks";
import Shell from "@/components/Shell";
import { currentUser } from "@/lib/auth";
import { t, type Lang } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { statusOf, type Parcel } from "@/lib/parcels";
import { listParcels, listParcelsFor, listParcelsToPhone } from "@/lib/store";

export const metadata = { title: "Track a parcel · Izza" };

export default function TrackPage() {
  return (
    <Shell title="Track" subtitle="Where is my parcel?">
      <Suspense fallback={<p className="muted">Loading…</p>}>
        <Content />
      </Suspense>
    </Shell>
  );
}

async function Content() {
  const lang = await getLang();
  return (
    <>
      <h1 style={{ fontSize: 26 }}>{t(lang, "Where's my parcel?")}</h1>
      <p className="muted" style={{ margin: 0 }}>
        {t(lang, "Type the code from your message.")}
      </p>
      <CodeForm cta={t(lang, "Track")} />

      <h2 className="section-title">{t(lang, "Your parcels")}</h2>
      <ParcelList lang={lang} />
      <LanguageLinks />
    </>
  );
}

const mergeParcels = (a: Parcel[], b: Parcel[]) => [...a, ...b.filter((p) => !a.some((x) => x.code === p.code))];

async function ParcelList({ lang }: { lang: Lang }) {
  const user = await currentUser();
  if (!user) {
    return (
      <p className="muted" style={{ margin: 0 }}>
        <Link href="/signin?next=/track" style={{ color: "var(--primary)", fontWeight: 700 }}>
          {t(lang, "Sign in")}
        </Link>{" "}
        {t(lang, "to see your parcels.")}
      </p>
    );
  }

  // A business sees what it sent. A customer sees what is addressed to their number. The team sees all.
  const mine =
    user.role === "admin"
      ? await listParcels()
      : user.role === "business"
        ? await listParcelsFor(user.id)
        : user.role === "customer"
          ? mergeParcels(await listParcelsToPhone(user.identifier), await listParcelsFor(user.id))
          : [];
  if (mine.length === 0) {
    return (
      <p className="muted" style={{ margin: 0 }}>
        {t(lang, "Nothing yet. Your parcels show up here.")}
      </p>
    );
  }

  return (
    <>
      {mine.map((p) => (
        <Link
          key={p.code}
          href={`/track/${p.code}`}
          className="card"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <div>
            <div style={{ fontWeight: 700 }}>{t(lang, "For {name}", { name: p.to })}</div>
            <div className="mono muted" style={{ fontSize: 13 }}>
              {p.code}
            </div>
          </div>
          <span className="chip chip-honey">{statusOf(p, lang)}</span>
        </Link>
      ))}
    </>
  );
}
