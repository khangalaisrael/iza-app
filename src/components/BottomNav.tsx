"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardText,
  DotsThreeOutline,
  MapPin,
  Package,
  PaperPlaneTilt,
  Storefront,
  UsersThree,
  ListChecks,
} from "@phosphor-icons/react";
import type { Tab, TabIcon } from "@/lib/nav";
import styles from "@/app/welcome/welcome.module.css";

const ICONS: Record<TabIcon, typeof Package> = {
  send: PaperPlaneTilt,
  track: Package,
  hub: MapPin,
  jobs: ListChecks,
  parcels: ClipboardText,
  team: UsersThree,
  point: Storefront,
  more: DotsThreeOutline,
};

// The main choices, pinned to the bottom of a phone where the thumb is. The current page is marked, and each choice has an icon
// and a word, so nobody has to guess what a symbol means.
export default function BottomNav({ tabs }: { tabs: Tab[] }) {
  const path = usePathname();
  return (
    <nav className={styles.bottomNav} aria-label="Menu">
      {tabs.map((tab) => {
        const Icon = ICONS[tab.icon];
        const here = path === tab.href || path.startsWith(tab.href + "/");
        return (
          <Link key={tab.href} href={tab.href} className={styles.bottomTab} aria-current={here ? "page" : undefined}>
            <span className={styles.bottomIcon}>
              <Icon size={26} weight={here ? "fill" : "regular"} aria-hidden="true" />
              {tab.badge ? (
                <span className={styles.bottomBadge} aria-label={`${tab.badge} waiting`}>
                  {tab.badge}
                </span>
              ) : null}
            </span>
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
