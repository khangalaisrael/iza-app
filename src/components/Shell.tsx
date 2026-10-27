import Link from "next/link";
import { Suspense } from "react";
import AccountButton from "./AccountButton";
import TabBar from "./TabBar";

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <header className="topbar">
        <Link href="/" className="badge" aria-label="Iza home">
          iza
        </Link>
        <Suspense fallback={<span className="avatar" aria-hidden="true" />}>
          <AccountButton />
        </Suspense>
      </header>
      <main className="page">{children}</main>
      <Suspense fallback={<nav className="tabbar" aria-label="Main" />}>
        <TabBar />
      </Suspense>
    </div>
  );
}
