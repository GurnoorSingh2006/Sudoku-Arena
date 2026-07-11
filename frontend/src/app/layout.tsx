import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import NotificationsHandler from "@/components/NotificationsHandler";

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Sudoku Arena | Play Singleplayer & Real-Time Multiplayer",
  description: "Challenge yourself with single-player Sudoku puzzles or compete head-to-head in real-time private multiplayer matches with friends. Premium aesthetics and Web Audio effects.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        {children}
        <NotificationsHandler />
      </body>
    </html>
  );
}

