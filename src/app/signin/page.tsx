import { Suspense } from "react";
import SignInForm from "@/components/SignInForm";
import Shell from "@/components/Shell";
import { safeNext } from "@/lib/auth";

export const metadata = { title: "Sign in · Izza" };

export default function SignInPage({ searchParams }: PageProps<"/signin">) {
  return (
    <Shell title="Sign in" subtitle="Use your phone number or email">
      <Suspense fallback={null}>
        <Form searchParams={searchParams} />
      </Suspense>
    </Shell>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/signin">["searchParams"] }) {
  const { next } = await searchParams;
  return <SignInForm next={safeNext(Array.isArray(next) ? next[0] : next)} />;
}
