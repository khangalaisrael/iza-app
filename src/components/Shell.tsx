import Link from "next/link";
import { Suspense } from "react";
import AccountButton from "./AccountButton";
import TabBar from "./TabBar";
import { currentUser } from "@/lib/auth";
import { tabsFor } from "@/lib/roles";

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
        <Tabs />
      </Suspense>
    </div>
  );
}

// The bottom bar is built from who is signed in: a runner never sees "Send", a customer never sees "My jobs".
async function Tabs() {
  const user = await currentUser();
  return <TabBar tabs={tabsFor(user?.role ?? null)} />;
}
