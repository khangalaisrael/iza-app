"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { NavItem } from "@/lib/nav";
import styles from "@/app/welcome/welcome.module.css";

// The header's second row on phones and tablets: each choice sits on the bar, and the ones with more inside open a
// dropdown. Only one is open at a time, and it closes when you tap elsewhere or press Escape.
export default function NavStrip({ items }: { items: NavItem[] }) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const closeAll = () => root.current?.querySelectorAll("details[open]").forEach((d) => d.removeAttribute("open"));
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) closeAll();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeAll();
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <nav ref={root} className={styles.navStrip} aria-label="Menu">
      <div className={styles.navScroll}>
      {items.map((item) =>
        item.children ? (
          <details key={item.label} name="strip" className={styles.stripGroup}>
            <summary className={styles.stripTab}>
              {item.label}
              <svg className={styles.stripCaret} width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </summary>
            <div className={styles.stripPanel}>
              {item.children.map((c) => (
                <Link key={c.href + c.label} href={c.href} className={styles.stripItem}>
                  {c.label}
                </Link>
              ))}
            </div>
          </details>
        ) : (
          <Link key={item.label} href={item.href} className={styles.stripTab}>
            {item.label}
          </Link>
        ),
      )}
      </div>
    </nav>
  );
}
