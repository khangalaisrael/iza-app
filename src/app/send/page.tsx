import SendForm from "@/components/SendForm";
import Shell from "@/components/Shell";

export const metadata = { title: "Send something · Iza" };

export default function SendPage() {
  return (
    <Shell>
      <SendForm />
    </Shell>
  );
}
