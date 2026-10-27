import Link from "next/link";
import { Suspense } from "react";
import TabBar from "./TabBar";

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <header className="topbar">
        <Link href="/" className="badge" aria-label="Iza home">
          iza
        </Link>
        <span className="avatar" aria-hidden="true">
          L
        </span>
      </header>
      <main className="page">{children}</main>
      <Suspense fallback={<nav className="tabbar" aria-label="Main" />}>
        <TabBar />
      </Suspense>
    </div>
  );
}
