import { requireUser } from "@/lib/auth";
import type { Role, User } from "@/lib/users";

// Wrap a page's content in this (inside <Suspense>) to keep it to signed-in people with the right role.
export default async function RequireRole({
  roles,
  next,
  children,
}: {
  roles: Role[];
  next: string;
  children: (user: User) => React.ReactNode;
}) {
  const user = await requireUser(roles, next);
  return <>{children(user)}</>;
}
