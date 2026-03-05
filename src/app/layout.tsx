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
      <head>
        <script src="https://cdn.jsdelivr.net/npm/twemoji@14.0.2/dist/twemoji.min.js" crossOrigin="anonymous" />
      </head>
      <body className="antialiased min-h-screen">
        {children}
        <Analytics />
        <SpeedInsights />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              function parseEmoji() {
                if (typeof twemoji !== 'undefined') {
                  twemoji.parse(document.body, { folder: 'svg', ext: '.svg' });
                }
              }
              // Parse on load and observe DOM changes
              if (document.readyState === 'complete') parseEmoji();
              else window.addEventListener('load', parseEmoji);
              new MutationObserver(function() { parseEmoji(); }).observe(document.body, { childList: true, subtree: true });
            `,
          }}
        />
      </body>
    </html>
  );
}
