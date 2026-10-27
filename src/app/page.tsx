import Link from "next/link";
import CodeForm from "@/components/CodeForm";
import Shell from "@/components/Shell";

const tiles = [
  { href: "/send", title: "Send something", note: "From R12" },
  { href: "/track/IZA-4825", title: "Collect nearby", note: "1 parcel ready" },
  { href: "/track", title: "Where's my parcel?", note: "1 on the way" },
  { href: "/send", title: "For my business", note: "Daily pickups" },
];

export default function Home() {
  return (
    <Shell>
      <section className="hero">
        <p className="greeting">Molo, Lindiwe</p>
        <h1>Order anywhere. Collect around the corner.</h1>
        <CodeForm />
      </section>

      <h2 className="section-title">What would you like to do?</h2>
      <div className="grid2">
        {tiles.map((t) => (
          <Link key={t.title} href={t.href} className="card tile">
            <strong>{t.title}</strong>
            <span>{t.note}</span>
          </Link>
        ))}
      </div>

      <div className="card" style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ flexGrow: 1, minWidth: 0 }}>
          <div className="muted" style={{ fontSize: 13 }}>
            Your Iza address
          </div>
          <div className="mono" style={{ fontSize: 15 }}>
            LANGA-BLUEGATE-27
          </div>
        </div>
        <span className="chip chip-primary">Share</span>
      </div>
      <div className="grid2">
        <Link href="/runner" className="card tile">
          <strong>Earn with Iza</strong>
          <span>Runner jobs</span>
        </Link>
        <Link href="/point" className="card tile">
          <strong>Host an Iza point</strong>
          <span>Shop view</span>
        </Link>
      </div>
      <Link href="/ops" className="card tile">
        <strong>Team dashboard</strong>
        <span>Live deliveries and counts</span>
      </Link>
    </Shell>
  );
}
