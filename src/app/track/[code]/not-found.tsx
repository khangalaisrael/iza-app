import Link from "next/link";
import Shell from "@/components/Shell";

export default function ParcelNotFound() {
  return (
    <Shell>
      <h1 style={{ fontSize: 26 }}>We couldn&apos;t find that code</h1>
      <p className="muted" style={{ margin: 0 }}>
        Check the code in your message and try again. Codes look like IZA-4821.
      </p>
      <Link className="btn btn-primary" href="/track">
        Try again
      </Link>
    </Shell>
  );
}
