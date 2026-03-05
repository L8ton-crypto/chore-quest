import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChoreQuest - Gamified Chore Chart for Kids",
  description:
    "Turn household chores into epic quests! Kids earn XP, level up, collect badges and compete on the family leaderboard.",
  openGraph: {
    title: "ChoreQuest - Gamified Chore Chart for Kids",
    description:
      "Turn household chores into epic quests! Kids earn XP, level up, collect badges and compete on the family leaderboard.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
