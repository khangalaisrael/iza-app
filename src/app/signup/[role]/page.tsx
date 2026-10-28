import { notFound } from "next/navigation";
import { Suspense } from "react";
import BusinessSignUp from "@/components/signup/BusinessSignUp";
import CustomerSignUp from "@/components/signup/CustomerSignUp";
import PointSignUp from "@/components/signup/PointSignUp";
import RunnerSignUp from "@/components/signup/RunnerSignUp";
import Shell from "@/components/Shell";
import { safeNext } from "@/lib/auth";

export const metadata = { title: "Join Izza" };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default function SignUpRolePage({ params, searchParams }: PageProps<"/signup/[role]">) {
  return (
    <Shell title="Sign up" subtitle="Make an account">
      <Suspense fallback={null}>
        <Form params={params} searchParams={searchParams} />
      </Suspense>
    </Shell>
  );
}

// One page for each way of joining. Each form is its own component, with its own sign-up action.
async function Form({ params, searchParams }: { params: PageProps<"/signup/[role]">["params"]; searchParams: PageProps<"/signup/[role]">["searchParams"] }) {
  const { role } = await params;
  const next = safeNext(first((await searchParams).next));
  switch (role) {
    case "customer":
      return <CustomerSignUp next={next} />;
    case "business":
      return <BusinessSignUp next={next} />;
    case "runner":
      return <RunnerSignUp next={next} />;
    case "point":
      return <PointSignUp next={next} />;
    default:
      notFound();
  }
}
