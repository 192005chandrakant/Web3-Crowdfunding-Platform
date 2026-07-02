import type { ReactNode } from "react";
import { Instrument_Serif, Plus_Jakarta_Sans } from "next/font/google";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { Providers } from "./providers";
import "./globals.css";

const displayFont = Instrument_Serif({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-display"
});

const bodyFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body"
});

export const metadata = {
  title: "Premium Nebula Crowdfunding",
  description: "Polygon crowdfunding with milestone escrow, Graph indexing, and premium Web3 UX."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body className="min-h-screen text-white/90 antialiased">
        <Providers>
          <div className="relative min-h-screen overflow-x-hidden bg-nebula-radial">
            <DesktopSidebar />
            <MobileBottomNav />
            <main className="mx-auto min-h-screen max-w-[1600px] px-4 py-6 lg:pl-[19rem] lg:pr-8 xl:pr-10">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}