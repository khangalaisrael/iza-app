"use client";

import { useActionState } from "react";
import { signUpCustomerAction } from "@/app/auth/signup";
import type { AuthState } from "@/app/auth/actions";
import { Basics, Foot, Heading } from "./Fields";

// Someone getting a parcel, or sending one from home. The least we can ask: who, how to reach them, a password.
export default function CustomerSignUp({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUpCustomerAction, {});
  return (
    <form action={action} className="stack" noValidate>
      <Heading title="Get started" lead="For anyone getting a parcel, or sending one. You can start straight away." />
      <input type="hidden" name="next" value={next} />
      <Basics values={state.values} />
      <Foot error={state.error} pending={pending} cta="Create my account" next={next} />
    </form>
  );
}
