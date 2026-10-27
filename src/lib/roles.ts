import type { Role } from "./users";

// Where each kind of person lands after signing in, and what their workspace is called.
// Customers use the public screens. Everyone who works gets their own place, with nothing else in the way.
export const WORKSPACE: Record<Role, { href: string; label: string }> = {
  customer: { href: "/", label: "Home" },
  business: { href: "/parcels", label: "My parcels" },
  runner: { href: "/runner", label: "My jobs" },
  point: { href: "/point", label: "My Iza point" },
  admin: { href: "/ops", label: "Team dashboard" },
};

export const landingFor = (role: Role) => WORKSPACE[role].href;

// Tabs on the phone's bottom bar. Only a business ever sees "Send". A runner never does.
export function tabsFor(role: Role | null): { href: string; label: string; icon: string }[] {
  const home = { href: "/", label: "Home", icon: "M3 11l9-7 9 7v9H3z" };
  const send = { href: "/send", label: "Send", icon: "M4 7h16v13H4zM4 11h16M12 7v4" };
  const collect = { href: "/collect", label: "Collect", icon: "M12 21s7-6 7-11a7 7 0 10-14 0c0 5 7 11 7 11zM12 12a2 2 0 100-4 2 2 0 000 4z" };
  const track = { href: "/track", label: "Track", icon: "M18 11a7 7 0 11-14 0 7 7 0 0114 0zM20 20l-4-4" };
  const jobs = { href: "/runner", label: "My jobs", icon: "M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" };
  const shop = { href: "/point", label: "My point", icon: "M3 9l2-5h14l2 5M5 9v11h14V9M9 20v-6h6v6" };
  const parcels = { href: "/parcels", label: "Parcels", icon: "M4 7h16v13H4zM4 11h16M12 7v4" };
  switch (role) {
    case "runner":
      return [jobs];
    case "point":
      return [shop];
    case "business":
      return [parcels, send, track];
    case "admin":
      return [{ href: "/ops", label: "Team", icon: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" }, send, collect, track];
    default:
      return [home, collect, track];
  }
}
