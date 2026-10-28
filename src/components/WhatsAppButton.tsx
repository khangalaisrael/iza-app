import { WhatsappLogo } from "@phosphor-icons/react/dist/ssr";

// "Chat with us on WhatsApp", at the corner of every page. It needs the Izza number in NEXT_PUBLIC_WHATSAPP_NUMBER.
export default function WhatsAppButton() {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  if (!number) return null;
  const digits = number.replace(/[\s()+-]/g, "");
  const intl = digits.startsWith("0") ? `27${digits.slice(1)}` : digits;
  return (
    <a
      className="waFab"
      href={`https://wa.me/${intl}?text=${encodeURIComponent("Hi Izza, I need help with a parcel.")}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Izza on WhatsApp"
    >
      <WhatsappLogo size={30} weight="fill" aria-hidden="true" />
      <span>WhatsApp us</span>
    </a>
  );
}
