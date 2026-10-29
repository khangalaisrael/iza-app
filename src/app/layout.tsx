import type { Metadata } from "next";
import { Bricolage_Grotesque, JetBrains_Mono, Nunito_Sans } from "next/font/google";
import "./globals.css";
import ConnectionBanner from "@/components/ConnectionBanner";

// Headings: warm and calm. Only 500 and 600 are loaded, so a heavier weight asked for anywhere still lands on 600.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["500", "600"],
});

const nunito = Nunito_Sans({
  variable: "--font-nunito",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["500"],
});

export const metadata: Metadata = {
  title: "Izza: bringing it closer",
  description: "Delivery for villages and townships. No street address needed, a landmark is enough.",
  // What a phone uses when someone adds Izza to their home screen.
  appleWebApp: { capable: true, title: "Izza", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${nunito.variable} ${mono.variable}`}
    >
      <body>
        {children}
        <ConnectionBanner />
      </body>
    </html>
  );
}
