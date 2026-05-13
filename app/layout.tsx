import type { Metadata } from "next";
import { Architects_Daughter, Fraunces, Long_Cang, Patrick_Hand, Quicksand, ZCOOL_KuaiLe } from "next/font/google";
import { MusicPlayer } from "@/components/global/MusicPlayer";
import { ClientProviders } from "./providers";
import "./globals.css";

const GLOBAL_BG = "/images/background-new.jpg";

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

const architectsDaughter = Architects_Daughter({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-architects-daughter",
  display: "swap",
});

const longCang = Long_Cang({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-long-cang",
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
      className={`${quicksand.variable} ${fraunces.variable} ${patrickHand.variable} ${zcoolKuaiLe.variable} ${architectsDaughter.variable} ${longCang.variable} h-full antialiased`}
    >
      <head>
        <link rel="preload" href="/images/pixel-cursor-web.png" as="image" />
        <link rel="preload" href={GLOBAL_BG} as="image" fetchPriority="high" />
        <link rel="preload" href="/images/rory/rory-avatar-frame.png" as="image" />
        <link rel="preload" href="/images/decoration/washi-tape-purple.svg" as="image" />
        <link rel="preload" href="/images/decoration/kraft-paper-texture.svg" as="image" />
        <link rel="preload" href="/images/rory/rory-typing.png" as="image" />
        <link rel="preload" href="/images/rory/rory-celebrate.png" as="image" />
      </head>
      <body
        className={`${quicksand.className} relative min-h-full min-w-[1024px] overflow-x-hidden text-[#f4f0ff]`}
      >
        {/* 全局底层背景：fixed + cover，确保滚动/切换时不抖动 */}
        <div
          className="pointer-events-none fixed inset-0 -z-[1]"
          aria-hidden
          style={{
            backgroundImage: `url(${GLOBAL_BG})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundAttachment: "fixed",
          }}
        />
        <ClientProviders>{children}</ClientProviders>
        <MusicPlayer />
      </body>
    </html>
  );
}
