import { Suspense } from "react";
import RequireRole from "@/components/RequireRole";
import SendForm from "@/components/SendForm";
import Shell from "@/components/Shell";

export const metadata = { title: "Send something · Iza" };

export default function SendPage() {
  return (
    <Shell>
      <Suspense fallback={<p className="muted">Loading…</p>}>
        <RequireRole roles={["customer"]} next="/send">
          {() => <SendForm />}
        </RequireRole>
      </Suspense>
    </Shell>
  );
}
