"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// When the signal drops, say so in plain words, so a dead connection does not look like a broken app. When it comes back the page
// refreshes itself and the notice goes away.
export default function ConnectionBanner() {
  const router = useRouter();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);
    const down = () => setOffline(true);
    const up = () => {
      setOffline(false);
      router.refresh();
    };
    window.addEventListener("offline", down);
    window.addEventListener("online", up);
    return () => {
      window.removeEventListener("offline", down);
      window.removeEventListener("online", up);
    };
  }, [router]);

  if (!offline) return null;
  return (
    <div className="offlineBar" role="status">
      <strong>No signal.</strong> You are seeing what we last had. It will update by itself when you are back online.
    </div>
  );
}
