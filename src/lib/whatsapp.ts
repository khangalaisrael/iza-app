// A South African number such as 082 345 6789 as WhatsApp wants it: digits only, with the country code.
export function whatsappNumber(phone: string): string {
  const digits = phone.replace(/[\s()+-]/g, "");
  return digits.startsWith("0") ? `27${digits.slice(1)}` : digits;
}

// Turns a number into a WhatsApp link with a message ready to send.
export function whatsappLink(phone: string, message: string): string {
  return `https://wa.me/${whatsappNumber(phone)}?text=${encodeURIComponent(message)}`;
}
