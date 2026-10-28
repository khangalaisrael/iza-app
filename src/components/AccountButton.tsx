import Link from "next/link";
import { signOutAction } from "@/app/auth/actions";
import { currentUser } from "@/lib/auth";
import { WORKSPACE } from "@/lib/roles";
import type { User } from "@/lib/users";

const roleLabel = {
  customer: "Customer",
  business: "Business",
  runner: "Runner",
  point: "Izza point",
  admin: "Izza team",
} as const;

export default async function AccountButton() {
  const user = await currentUser();

  if (!user) {
    return (
      <Link href="/signin" className="btn btn-primary" style={{ minHeight: 48, padding: "0 20px", fontSize: 16 }}>
        Sign in
      </Link>
    );
  }

  return <AccountMenu user={user} />;
}

export function AccountMenu({ user }: { user: User }) {
  return (
    <details className="account">
      <summary className="avatar" aria-label={`Account menu for ${user.name}`}>
        {user.name.charAt(0).toUpperCase()}
      </summary>
      <div className="accountMenu">
        <strong>{user.name}</strong>
        <span className="muted">{roleLabel[user.role]}</span>
        {user.status === "pending" && <span className="chip chip-honey">Waiting for approval</span>}
        {user.status === "active" && user.role !== "customer" && (
          <Link href={WORKSPACE[user.role].href} className="btn btn-soft btn-block" style={{ minHeight: 44 }}>
            {WORKSPACE[user.role].label}
          </Link>
        )}
        <form action={signOutAction}>
          <button className="btn btn-block" type="submit" style={{ minHeight: 40 }}>
            Sign out
          </button>
        </form>
      </div>
    </details>
  );
}
