import { permanentRedirect } from "next/navigation";

// The website home now lives at the front door.
export default function Welcome() {
  permanentRedirect("/");
}
