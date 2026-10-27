import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";
import Shell from "@/components/Shell";
import { safeNext } from "@/lib/auth";

export const metadata = { title: "Join Iza" };

export default function SignUpPage({ searchParams }: PageProps<"/signup">) {
  return (
    <Shell>
      <Suspense fallback={null}>
        <Form searchParams={searchParams} />
      </Suspense>
    </Shell>
  );
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Form({ searchParams }: { searchParams: PageProps<"/signup">["searchParams"] }) {
  const { next, as } = await searchParams;
  // /signup?as=runner opens the form already set to the right way of joining.
  const startRole = ["customer", "business", "runner", "point"].includes(first(as) ?? "") ? first(as)! : "customer";
  return <AuthForm mode="signup" next={safeNext(first(next))} startRole={startRole} />;
}
