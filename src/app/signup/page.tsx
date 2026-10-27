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

async function Form({ searchParams }: { searchParams: PageProps<"/signup">["searchParams"] }) {
  const { next } = await searchParams;
  return <AuthForm mode="signup" next={safeNext(Array.isArray(next) ? next[0] : next)} />;
}
