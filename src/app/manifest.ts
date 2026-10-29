import type { MetadataRoute } from "next";

// Lets a phone add Izza to the home screen like an app, which is also what iPhones need before they can show notifications.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Izza: bringing it closer",
    short_name: "Izza",
    description: "Neighbourhood parcel delivery for Cape Town.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3eee4",
    theme_color: "#162a22",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
