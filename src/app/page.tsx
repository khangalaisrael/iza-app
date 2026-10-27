import Link from "next/link";
import { Suspense } from "react";
import { MagnifyingGlass, MapPin, Package, Storefront } from "@phosphor-icons/react/dist/ssr";
import CodeForm from "@/components/CodeForm";
import Shell from "@/components/Shell";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { landingFor } from "@/lib/roles";
import type { User } from "@/lib/users";

const tiles = [
  { href: "/send", title: "Send a parcel", note: "For shops and sellers", icon: Package },
  { href: "/collect", title: "Collect nearby", note: "Find a shop near you", icon: MapPin },
  { href: "/track", title: "Where's my parcel?", note: "Use your code", icon: MagnifyingGlass },
  { href: "/business", title: "For my business", note: "Daily pickups", icon: Storefront },
];

export default function Home() {
  return (
    <Shell>
      <Suspense fallback={<Greeting name={null} />}>
        <Top />
      </Suspense>

      <h2 className="section-title">What would you like to do?</h2>
      <div className="grid2">
        {tiles.map(({ href, title, note, icon: Icon }) => (
          <Link key={title} href={href} className="card tile">
            <span className="tileIcon">
              <Icon size={30} weight="bold" aria-hidden="true" />
            </span>
            <strong>{title}</strong>
            <span>{note}</span>
          </Link>
        ))}
      </div>

      <Suspense fallback={null}>
        <RoleLink />
      </Suspense>
    </Shell>
  );
}

function Greeting({ name }: { name: string | null }) {
  return (
    <section className="hero">
      <p className="greeting">Molo, {name ?? "neighbour"}</p>
      <h1>Order anywhere. Collect around the corner.</h1>
      <CodeForm />
    </section>
  );
}

async function Top() {
  const user = await currentUser();
  // Runners, shops, businesses and the team have their own place. The customer home is not for them.
  if (user && user.role !== "customer") redirect(landingFor(user.role));
  return <Greeting name={user ? user.name.split(" ")[0] : null} />;
}

// One extra door, and only for the person it is meant for.
const roleLinks: Record<User["role"], { href: string; title: string; note: string } | null> = {
  runner: { href: "/runner", title: "Today's jobs", note: "See what to collect and deliver" },
  point: { href: "/point", title: "My shop", note: "Parcels waiting for people" },
  admin: { href: "/ops", title: "Team dashboard", note: "Deliveries and approvals" },
  business: { href: "/send", title: "Send a parcel", note: "To an Iza point near your customer" },
  customer: null,
};

async function RoleLink() {
  const user = await currentUser();
  const link = user ? roleLinks[user.role] : null;

  if (link) {
    return (
      <Link href={link.href} className="banner">
        <span>
          <strong>{link.title}</strong>
          <small>{link.note}</small>
        </span>
        <span aria-hidden="true">→</span>
      </Link>
    );
  }

  // Everyone else is invited to earn with Iza.
  return (
    <Link href="/join" className="banner">
      <span>
        <strong>Earn with Iza</strong>
        <small>Become a runner or host an Iza point</small>
      </span>
      <span aria-hidden="true">→</span>
    </Link>
  );
}
