import type { Metadata } from "next";
import { JetBrains_Mono, Nunito_Sans, Rubik } from "next/font/google";
import "./globals.css";
import ConnectionBanner from "@/components/ConnectionBanner";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
  weight: ["500", "700", "800"],
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
  description:
    "Neighbourhood delivery for Cape Town. No street address needed, a landmark is enough.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${rubik.variable} ${nunito.variable} ${mono.variable}`}
    >
      <body>
        {children}
        <ConnectionBanner />
      </body>
    </html>
  );
}
