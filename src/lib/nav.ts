import type { Role } from "./users";

export type NavChild = { label: string; href: string };
export type NavItem = { label: string; href: string; children?: NavChild[]; badge?: number };

const send: NavItem = {
  label: "Send",
  href: "/send",
  children: [
    { label: "Send a parcel", href: "/send" },
    { label: "How sending works", href: "/business#how" },
    { label: "What it costs", href: "/business#cost" },
  ],
};

const collect: NavItem = {
  label: "Collect",
  href: "/points",
  children: [
    { label: "Find an Izza point", href: "/points" },
    { label: "Collect with my code", href: "/collect" },
    { label: "Where's my parcel?", href: "/track" },
  ],
};

const business: NavItem = {
  label: "For my business",
  href: "/business",
  children: [
    { label: "Why businesses use Izza", href: "/business" },
    { label: "Open a business account", href: "/signup?as=business" },
    { label: "Your dashboard", href: "/signin?next=%2Fparcels" },
  ],
};

const join: NavItem = {
  label: "Join us",
  href: "/join",
  children: [
    { label: "Become a runner", href: "/signup?as=runner" },
    { label: "Host an Izza point", href: "/signup?as=point" },
    { label: "See all the ways to join", href: "/join" },
  ],
};

const why: NavItem = {
  label: "Why Izza",
  href: "/why",
  children: [
    { label: "Our story", href: "/why#story" },
    { label: "How we operate", href: "/why#operate" },
    { label: "Safe by design", href: "/why#safe" },
  ],
};

// The top menu is built from who is signed in. A runner never sees "Send", a customer never sees "For my business".
export function navFor(role: Role | null): NavItem[] {
  switch (role) {
    case "runner":
      return [{ label: "My jobs", href: "/runner" }];
    case "point":
      return [{ label: "My Izza point", href: "/point" }];
    case "business":
      return [{ label: "My parcels", href: "/parcels" }, send, why];
    case "admin":
      return [{ label: "Team", href: "/ops" }, send, collect, why];
    case "customer":
      return [send, collect, join, why];
    default:
      return [send, collect, business, join, why];
  }
}

// The choices pinned to the bottom of a phone. Each is a place people go every day, with an icon and one word.
// Everything else lives on the More page.
export type TabIcon = "send" | "track" | "hub" | "jobs" | "parcels" | "team" | "point" | "more";
export type Tab = { label: string; href: string; icon: TabIcon; badge?: number };

const more: Tab = { label: "More", href: "/more", icon: "more" };
const sendTab: Tab = { label: "Send", href: "/send", icon: "send" };
const trackTab: Tab = { label: "Track", href: "/track", icon: "track" };

export function tabsFor(role: Role | null): Tab[] {
  switch (role) {
    case "runner":
      return [{ label: "My jobs", href: "/runner", icon: "jobs" }, more];
    case "point":
      return [{ label: "My point", href: "/point", icon: "point" }, trackTab, more];
    case "business":
      return [{ label: "My parcels", href: "/parcels", icon: "parcels" }, sendTab, trackTab, more];
    case "admin":
      return [{ label: "Team", href: "/ops", icon: "team" }, sendTab, trackTab, more];
    default:
      return [sendTab, trackTab, { label: "Join us", href: "/join", icon: "point" }, more];
  }
}

// The two blocks at the right of the bar. Track is for people who wait for parcels; workers have their own dashboard.
export function actionsFor(role: Role | null) {
  return {
    find: role !== "runner" && role !== "point",
    track: role !== "runner" && role !== "point",
  };
}
