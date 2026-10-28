"use client";

import { useActionState } from "react";
import { signUpRunnerAction } from "@/app/auth/signup";
import type { AuthState } from "@/app/auth/actions";
import { TRANSPORT } from "@/lib/signupChoices";
import { Basics, Choose, Foot, Heading, Text } from "./Fields";

// A runner. We ask where they live and how they get around, so jobs are close to them, and that they are old enough.
export default function RunnerSignUp({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUpRunnerAction, {});
  return (
    <form action={action} className="stack" noValidate>
      <Heading title="Become a runner" lead="Deliver in the area you live in and get paid for every drop. The team looks at your application first." />
      <input type="hidden" name="next" value={next} />
      <Basics values={state.values} />
      <Text id="area" name="area" label="Where do you live?" placeholder="e.g. Langa" defaultValue={state.values?.area} />
      <Choose id="transport" name="transport" label="How will you get around?" options={TRANSPORT} defaultValue={state.values?.transport} />
      <label className="bigChoice" htmlFor="adult">
        <input id="adult" name="adult" type="checkbox" value="yes" />
        <span className="plain">
          <strong>I am 18 or older and have a South African ID</strong>
          <small>You will need it, and a phone with WhatsApp.</small>
        </span>
      </label>
      <Foot error={state.error} pending={pending} cta="Send my application" next={next} />
    </form>
  );
}
