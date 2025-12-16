import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Chefora – Your Personal AI Culinary Assistant",
  description: "An AI-powered cooking assistant that helps you create delicious recipes intelligently.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        style={{ isolation: "isolate" }}
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-dvh bg-slate-950 text-slate-100`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
