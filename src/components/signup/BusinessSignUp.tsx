"use client";

import { useActionState } from "react";
import { signUpBusinessAction } from "@/app/auth/signup";
import type { AuthState } from "@/app/auth/actions";
import { BUSINESS_KINDS } from "@/lib/signupChoices";
import { Basics, Choose, Foot, Heading, Text } from "./Fields";

// A shop or seller that sends parcels. We ask what they sell and where they are, because the team approves each business.
export default function BusinessSignUp({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUpBusinessAction, {});
  return (
    <form action={action} className="stack" noValidate>
      <Heading title="Send parcels for your business" lead="For shops and sellers. The team looks at your application, usually within a day." />
      <input type="hidden" name="next" value={next} />
      <Basics nameLabel="Business name" values={state.values} />
      <Choose id="category" name="category" label="What do you sell?" options={BUSINESS_KINDS} defaultValue={state.values?.category} />
      <Text id="area" name="area" label="Where are you based?" placeholder="e.g. Langa" defaultValue={state.values?.area} />
      <Foot error={state.error} pending={pending} cta="Send my application" next={next} />
    </form>
  );
}
