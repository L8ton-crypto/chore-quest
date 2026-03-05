"use client";

// Renders emoji as Twemoji images so they work on all browsers/devices
export default function Emoji({ emoji, size = 24, className = "" }: { emoji: string; size?: number; className?: string }) {
  // Convert emoji to Twemoji URL
  const codePoints = [...emoji]
    .map((char) => char.codePointAt(0)?.toString(16))
    .filter(Boolean)
    .join("-");

  return (
    <img
      src={`https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${codePoints}.png`}
      alt={emoji}
      width={size}
      height={size}
      className={`inline-block ${className}`}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}
