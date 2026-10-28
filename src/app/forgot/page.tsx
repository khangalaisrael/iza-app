import Shell from "@/components/Shell";
import ForgotForm from "@/components/ForgotForm";

export const metadata = { title: "Forgot password · Izza", robots: { index: false } };

export default function ForgotPage() {
  return (
    <Shell title="Forgot password" subtitle="Ask for a new one">
      <ForgotForm />
    </Shell>
  );
}
