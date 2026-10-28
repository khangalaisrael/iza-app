import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";
import Shell from "@/components/Shell";
import { safeNext } from "@/lib/auth";

export const metadata = { title: "Sign in · Iza" };

export default function SignInPage({ searchParams }: PageProps<"/signin">) {
  return (
    <Shell title="Sign in" subtitle="Welcome back">
      <Suspense fallback={null}>
        <Form searchParams={searchParams} />
      </Suspense>
    </Shell>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/signin">["searchParams"] }) {
  const { next } = await searchParams;
  return <AuthForm mode="signin" next={safeNext(Array.isArray(next) ? next[0] : next)} />;
}
