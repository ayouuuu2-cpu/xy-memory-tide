import type { Metadata } from "next";
import { Fraunces, Patrick_Hand, Quicksand, ZCOOL_KuaiLe } from "next/font/google";
import { MusicPlayer } from "@/components/global/MusicPlayer";
import { ClientProviders } from "./providers";
import "./globals.css";

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-quicksand",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-fraunces",
  display: "swap",
});

const patrickHand = Patrick_Hand({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-hand",
  display: "swap",
});

const zcoolKuaiLe = ZCOOL_KuaiLe({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-zcool",
  display: "swap",
});

export const metadata: Metadata = {
  title: "X-Y Memory Tide",
  description:
    "Dual-world memory system: Earth memory for Yunnan, and a dream layer for abstract feeling — desktop immersive portal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Luminous runtime: `data-full-moon` / `data-celestial-birthday` on <html> from `CelestialProvider` (see app/providers.tsx).
  return (
    <html
      lang="en"
      className={`${quicksand.variable} ${fraunces.variable} ${patrickHand.variable} ${zcoolKuaiLe.variable} h-full antialiased`}
    >
      <head>
        <link rel="preload" href="/images/pixel-cursor-web.png" as="image" />
      </head>
      <body
        className={`${quicksand.className} min-h-full min-w-[1024px] overflow-x-hidden bg-[#080c14] text-[#f4f0ff]`}
      >
        <ClientProviders>{children}</ClientProviders>
        <MusicPlayer />
      </body>
    </html>
  );
}
