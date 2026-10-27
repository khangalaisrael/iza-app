"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Re-reads the server data every few seconds so tracking stays current without a reload.
export default function AutoRefresh({ seconds = 5 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
