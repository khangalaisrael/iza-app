// Turns a South African number such as 082 345 6789 into a WhatsApp link with a message ready to send.
export function whatsappLink(phone: string, message: string): string {
  const digits = phone.replace(/[\s()+-]/g, "");
  const international = digits.startsWith("0") ? `27${digits.slice(1)}` : digits;
  return `https://wa.me/${international}?text=${encodeURIComponent(message)}`;
}
