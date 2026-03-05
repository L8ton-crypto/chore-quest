"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AVATARS } from "@/lib/types";

interface FamilyInfo {
  id: string;
  name: string;
}

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<"welcome" | "create" | "join">("welcome");
  const [familyName, setFamilyName] = useState("");
  const [pin, setPin] = useState("1234");
  const [families, setFamilies] = useState<FamilyInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [initDone, setInitDone] = useState(false);

  // Check for saved family
  useEffect(() => {
    const saved = localStorage.getItem("cq_family_id");
    if (saved) {
      router.push(`/family/${saved}`);
    }
  }, [router]);

  // Init DB on first load
  useEffect(() => {
    if (!initDone) {
      fetch("/api/init", { method: "POST" }).then(() => setInitDone(true));
    }
  }, [initDone]);

  const loadFamilies = async () => {
    const res = await fetch("/api/family");
    const data = await res.json();
    setFamilies(data);
  };

  const handleCreate = async () => {
    if (!familyName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: familyName, pin }),
      });
      const family = await res.json();
      localStorage.setItem("cq_family_id", family.id);
      router.push(`/family/${family.id}`);
    } catch {
      alert("Failed to create family");
    }
    setLoading(false);
  };

  const handleJoin = (familyId: string) => {
    localStorage.setItem("cq_family_id", familyId);
    router.push(`/family/${familyId}`);
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {mode === "welcome" && (
          <div className="text-center space-y-8">
            {/* Hero */}
            <div className="space-y-4">
              <div className="text-7xl">⚔️</div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                ChoreQuest
              </h1>
              <p className="text-zinc-400 text-lg">
                Turn chores into epic quests. Earn XP, level up, collect badges!
              </p>
            </div>

            {/* Floating avatars */}
            <div className="flex justify-center gap-2 text-3xl">
              {AVATARS.slice(0, 8).map((a, i) => (
                <span
                  key={i}
                  className="animate-bounce"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  {a}
                </span>
              ))}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={() => setMode("create")}
                className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-xl text-lg hover:from-amber-600 hover:to-orange-700 transition-all active:scale-95"
              >
                🏰 Create Family
              </button>
              <button
                onClick={() => {
                  setMode("join");
                  loadFamilies();
                }}
                className="w-full py-4 px-6 bg-zinc-800 text-zinc-300 font-bold rounded-xl text-lg hover:bg-zinc-700 transition-all active:scale-95 border border-zinc-700"
              >
                🤝 Join Family
              </button>
            </div>
          </div>
        )}

        {mode === "create" && (
          <div className="space-y-6">
            <button
              onClick={() => setMode("welcome")}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              ← Back
            </button>
            <h2 className="text-2xl font-bold">Create Your Family</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Family Name
                </label>
                <input
                  type="text"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder="The Smiths"
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-amber-500 transition-colors"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Parent PIN (for parent mode)
                </label>
                <input
                  type="text"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="1234"
                  maxLength={6}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={loading || !familyName.trim()}
              className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-xl text-lg hover:from-amber-600 hover:to-orange-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? "Creating..." : "⚔️ Begin the Quest!"}
            </button>
          </div>
        )}

        {mode === "join" && (
          <div className="space-y-6">
            <button
              onClick={() => setMode("welcome")}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              ← Back
            </button>
            <h2 className="text-2xl font-bold">Join a Family</h2>

            {families.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">
                No families yet. Create one first!
              </p>
            ) : (
              <div className="space-y-3">
                {families.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => handleJoin(f.id)}
                    className="w-full py-4 px-6 bg-zinc-800 border border-zinc-700 rounded-xl text-left hover:bg-zinc-700 hover:border-amber-500/50 transition-all"
                  >
                    <span className="text-lg font-bold">{f.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
