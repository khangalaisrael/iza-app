import Link from "next/link";
import { Suspense } from "react";
import AccountButton from "./AccountButton";

// The frame for the working screens (runner, Iza point, business, team): wide on a computer, one column on a phone.
export default function PortalShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="portal">
      <header className="portalBar">
        <Link href="/" className="badge" aria-label="Iza home">
          iza
        </Link>
        <div className="portalTitle">
          <strong>{title}</strong>
          {subtitle && <span>{subtitle}</span>}
        </div>
        <Suspense fallback={<span className="avatar" aria-hidden="true" />}>
          <AccountButton />
        </Suspense>
      </header>
      <main className="portalMain">{children}</main>
    </div>
  );
}
