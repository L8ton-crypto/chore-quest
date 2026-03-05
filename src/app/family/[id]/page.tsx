"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Child,
  Quest,
  Completion,
  Badge,
  Reward,
  BADGE_DEFINITIONS,
  AVATARS,
  QUEST_ICONS,
  xpProgress,
} from "@/lib/types";

type Tab = "quests" | "badges" | "rewards" | "leaderboard";
type FamilyData = {
  family: { id: string; name: string };
  children: Child[];
  quests: Quest[];
  todayCompletions: Completion[];
  pendingApprovals: Completion[];
  badges: Badge[];
  rewards: Reward[];
  rewardClaims: { id: string; reward_title: string; reward_icon: string; child_name: string; child_avatar: string }[];
};

export default function FamilyPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<FamilyData | null>(null);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [tab, setTab] = useState<Tab>("quests");
  const [parentMode, setParentMode] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [showAddChild, setShowAddChild] = useState(false);
  const [showAddQuest, setShowAddQuest] = useState(false);
  const [showAddReward, setShowAddReward] = useState(false);
  const [newChildName, setNewChildName] = useState("");
  const [newChildAvatar, setNewChildAvatar] = useState("🦁");
  const [newQuest, setNewQuest] = useState({ title: "", description: "", xp_reward: 10, quest_type: "daily", icon: "⭐" });
  const [newReward, setNewReward] = useState({ title: "", description: "", xp_cost: 100, icon: "🎁" });
  const [celebration, setCelebration] = useState<{ type: string; message: string; badges?: { icon: string; name: string }[] } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`/api/family/${id}`);
      if (!res.ok) {
        router.push("/");
        return;
      }
      const d = await res.json();
      setData(d);
      if (!selectedChild && d.children.length > 0) {
        setSelectedChild(d.children[0]);
      } else if (selectedChild) {
        const updated = d.children.find((c: Child) => c.id === selectedChild.id);
        if (updated) setSelectedChild(updated);
      }
    } catch {
      router.push("/");
    }
  }, [id, router, selectedChild]);

  useEffect(() => {
    loadData();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCompleteQuest = async (quest: Quest) => {
    if (!selectedChild) return;
    try {
      const res = await fetch("/api/quests/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quest_id: quest.id, child_id: selectedChild.id }),
      });
      const result = await res.json();
      if (!res.ok) {
        alert(result.error || "Failed to complete quest");
        return;
      }

      // Show celebration
      if (result.leveledUp) {
        setCelebration({
          type: "levelup",
          message: `Level Up! ${selectedChild.name} is now Level ${result.newLevel}!`,
          badges: result.newBadges,
        });
      } else if (result.newBadges?.length > 0) {
        setCelebration({
          type: "badge",
          message: "New Badge Earned!",
          badges: result.newBadges,
        });
      } else {
        setCelebration({
          type: "xp",
          message: `+${result.xpEarned} XP!`,
        });
      }
      setTimeout(() => setCelebration(null), 3000);
      await loadData();
    } catch {
      alert("Failed to complete quest");
    }
  };

  const handleApprove = async (completionId: string, approved: boolean) => {
    await fetch("/api/quests/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completion_id: completionId, approved }),
    });
    await loadData();
  };

  const handleAddChild = async () => {
    if (!newChildName.trim()) return;
    await fetch("/api/children", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ family_id: id, name: newChildName, avatar: newChildAvatar }),
    });
    setNewChildName("");
    setNewChildAvatar("🦁");
    setShowAddChild(false);
    await loadData();
  };

  const handleAddQuest = async () => {
    if (!newQuest.title.trim()) return;
    await fetch("/api/quests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ family_id: id, ...newQuest }),
    });
    setNewQuest({ title: "", description: "", xp_reward: 10, quest_type: "daily", icon: "⭐" });
    setShowAddQuest(false);
    await loadData();
  };

  const handleAddReward = async () => {
    if (!newReward.title.trim()) return;
    await fetch("/api/rewards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ family_id: id, ...newReward }),
    });
    setNewReward({ title: "", description: "", xp_cost: 100, icon: "🎁" });
    setShowAddReward(false);
    await loadData();
  };

  const handleClaimReward = async (rewardId: string) => {
    if (!selectedChild) return;
    const res = await fetch("/api/rewards/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reward_id: rewardId, child_id: selectedChild.id }),
    });
    const result = await res.json();
    if (!res.ok) {
      alert(result.error || "Failed to claim reward");
      return;
    }
    setCelebration({ type: "reward", message: "Reward Claimed! Waiting for parent approval." });
    setTimeout(() => setCelebration(null), 3000);
    await loadData();
  };

  const verifyPin = async () => {
    const res = await fetch("/api/family/verify-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ family_id: id, pin: pinInput }),
    });
    const result = await res.json();
    if (result.valid) {
      setParentMode(true);
      setShowPinModal(false);
      setPinInput("");
    } else {
      alert("Wrong PIN!");
    }
  };

  const handleLeaveFamily = () => {
    localStorage.removeItem("cq_family_id");
    router.push("/");
  };

  const isQuestCompletedToday = (questId: string) => {
    if (!selectedChild || !data) return false;
    return data.todayCompletions.some(
      (c) => c.quest_id === questId && c.child_id === selectedChild.id
    );
  };

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl animate-pulse">⚔️ Loading quest board...</div>
      </div>
    );
  }

  const childBadges = selectedChild
    ? data.badges.filter((b) => b.child_id === selectedChild.id)
    : [];
  const progress = selectedChild ? xpProgress(selectedChild.xp) : null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Celebration overlay */}
      {celebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className={`text-center p-8 rounded-2xl ${
            celebration.type === "levelup"
              ? "bg-gradient-to-br from-yellow-500/90 to-amber-600/90 level-up-anim"
              : celebration.type === "badge"
              ? "bg-gradient-to-br from-purple-500/90 to-pink-600/90 badge-new"
              : celebration.type === "reward"
              ? "bg-gradient-to-br from-green-500/90 to-emerald-600/90 badge-new"
              : "bg-gradient-to-br from-blue-500/90 to-cyan-600/90 badge-new"
          }`}>
            <div className="text-5xl mb-3">
              {celebration.type === "levelup" ? "🎉" : celebration.type === "badge" ? "🏅" : celebration.type === "reward" ? "🎁" : "✨"}
            </div>
            <div className="text-2xl font-bold text-white">{celebration.message}</div>
            {celebration.badges?.map((b, i) => (
              <div key={i} className="mt-2 text-lg text-white/90">
                {b.icon} {b.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚔️</span>
            <div>
              <h1 className="font-bold text-lg bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                ChoreQuest
              </h1>
              <p className="text-xs text-zinc-500">{data.family.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {parentMode ? (
              <button
                onClick={() => setParentMode(false)}
                className="px-3 py-1.5 text-sm bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30"
              >
                👑 Parent Mode
              </button>
            ) : (
              <button
                onClick={() => setShowPinModal(true)}
                className="px-3 py-1.5 text-sm bg-zinc-800 text-zinc-400 rounded-lg hover:bg-zinc-700 transition-colors"
              >
                🔒 Parent
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden px-2 py-1.5 text-sm bg-zinc-800 text-zinc-400 rounded-lg"
            >
              ☰
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex max-w-4xl mx-auto w-full">
        {/* Sidebar - child selector */}
        <aside className={`${mobileMenuOpen ? "block" : "hidden"} md:block w-full md:w-56 bg-zinc-900 border-r border-zinc-800 p-3 flex-shrink-0 fixed md:relative inset-0 top-[60px] z-40 md:z-auto`}>
          <div className="space-y-2 mb-4">
            <h3 className="text-xs uppercase text-zinc-500 font-semibold tracking-wider px-2">
              Adventurers
            </h3>
            {data.children.map((child) => (
              <button
                key={child.id}
                onClick={() => {
                  setSelectedChild(child);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                  selectedChild?.id === child.id
                    ? "bg-amber-500/20 border border-amber-500/30"
                    : "hover:bg-zinc-800 border border-transparent"
                }`}
              >
                <span className="text-2xl">{child.avatar}</span>
                <div className="text-left flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{child.name}</div>
                  <div className="text-xs text-zinc-500">
                    Lv.{child.level} · {child.xp} XP
                  </div>
                </div>
              </button>
            ))}
            {parentMode && (
              <button
                onClick={() => setShowAddChild(true)}
                className="w-full p-2.5 text-sm text-zinc-500 hover:text-zinc-300 border border-dashed border-zinc-700 rounded-xl hover:border-zinc-500 transition-colors"
              >
                + Add Child
              </button>
            )}
          </div>

          {/* Bottom actions */}
          <div className="mt-4 pt-4 border-t border-zinc-800 space-y-2">
            <button
              onClick={handleLeaveFamily}
              className="w-full text-left px-3 py-2 text-sm text-zinc-500 hover:text-red-400 transition-colors rounded-lg hover:bg-zinc-800"
            >
              🚪 Leave Family
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 overflow-y-auto">
          {!selectedChild ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="text-5xl mb-4">👋</div>
              <h2 className="text-xl font-bold mb-2">No adventurers yet!</h2>
              <p className="text-zinc-500 mb-4">
                Enter parent mode to add children to the quest board.
              </p>
            </div>
          ) : (
            <>
              {/* XP Bar */}
              {progress && (
                <div className="mb-6 bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">{selectedChild.avatar}</span>
                      <div>
                        <h2 className="font-bold text-lg">{selectedChild.name}</h2>
                        <span className="text-amber-400 text-sm font-semibold">
                          Level {progress.level}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-zinc-400">
                        {progress.currentXP} / {progress.nextLevelXP} XP
                      </div>
                      <div className="text-xs text-zinc-600">
                        Total: {selectedChild.xp} XP
                      </div>
                    </div>
                  </div>
                  <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full xp-bar-fill transition-all duration-500"
                      style={{ width: `${Math.min(progress.progress, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className="flex gap-1 mb-4 bg-zinc-900 rounded-xl p-1 border border-zinc-800 overflow-x-auto">
                {(["quests", "badges", "rewards", "leaderboard"] as Tab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                      tab === t
                        ? "bg-amber-500/20 text-amber-400"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {t === "quests" && "⚔️ "}
                    {t === "badges" && "🏅 "}
                    {t === "rewards" && "🎁 "}
                    {t === "leaderboard" && "🏆 "}
                    <span className="hidden sm:inline capitalize">{t}</span>
                  </button>
                ))}
              </div>

              {/* Quest Board */}
              {tab === "quests" && (
                <div className="space-y-3">
                  {parentMode && (
                    <button
                      onClick={() => setShowAddQuest(true)}
                      className="w-full p-4 border-2 border-dashed border-zinc-700 rounded-xl text-zinc-500 hover:text-amber-400 hover:border-amber-500/50 transition-all"
                    >
                      + Add New Quest
                    </button>
                  )}

                  {data.quests.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500">
                      <div className="text-4xl mb-3">📜</div>
                      <p>No quests available. {parentMode ? "Add some above!" : "Ask a parent to create quests."}</p>
                    </div>
                  ) : (
                    <>
                      {/* Daily quests */}
                      {data.quests.filter((q) => q.quest_type === "daily").length > 0 && (
                        <div>
                          <h3 className="text-xs uppercase text-zinc-500 font-semibold tracking-wider mb-2 px-1">
                            Daily Quests
                          </h3>
                          <div className="grid gap-2">
                            {data.quests
                              .filter((q) => q.quest_type === "daily")
                              .map((quest) => {
                                const done = isQuestCompletedToday(quest.id);
                                return (
                                  <div
                                    key={quest.id}
                                    className={`quest-card flex items-center gap-3 p-4 rounded-xl border transition-all ${
                                      done
                                        ? "bg-green-500/10 border-green-500/20 opacity-60"
                                        : "bg-zinc-900 border-zinc-800 hover:border-amber-500/30"
                                    }`}
                                  >
                                    <span className="text-3xl">{quest.icon}</span>
                                    <div className="flex-1 min-w-0">
                                      <div className={`font-semibold ${done ? "line-through text-zinc-500" : ""}`}>
                                        {quest.title}
                                      </div>
                                      {quest.description && (
                                        <div className="text-xs text-zinc-500 truncate">{quest.description}</div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <span className="text-amber-400 font-bold text-sm">
                                        +{quest.xp_reward} XP
                                      </span>
                                      {!done && !parentMode && (
                                        <button
                                          onClick={() => handleCompleteQuest(quest)}
                                          className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm font-semibold hover:bg-amber-600 transition-colors active:scale-95"
                                        >
                                          Done!
                                        </button>
                                      )}
                                      {done && <span className="text-green-500">✓</span>}
                                      {parentMode && (
                                        <button
                                          onClick={async () => {
                                            await fetch("/api/quests", {
                                              method: "DELETE",
                                              headers: { "Content-Type": "application/json" },
                                              body: JSON.stringify({ id: quest.id }),
                                            });
                                            loadData();
                                          }}
                                          className="px-2 py-1 text-red-400 hover:bg-red-500/20 rounded text-sm"
                                        >
                                          ✕
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Weekly quests */}
                      {data.quests.filter((q) => q.quest_type === "weekly").length > 0 && (
                        <div className="mt-4">
                          <h3 className="text-xs uppercase text-zinc-500 font-semibold tracking-wider mb-2 px-1">
                            Weekly Quests
                          </h3>
                          <div className="grid gap-2">
                            {data.quests
                              .filter((q) => q.quest_type === "weekly")
                              .map((quest) => {
                                const done = isQuestCompletedToday(quest.id);
                                return (
                                  <div
                                    key={quest.id}
                                    className={`quest-card flex items-center gap-3 p-4 rounded-xl border transition-all ${
                                      done
                                        ? "bg-green-500/10 border-green-500/20 opacity-60"
                                        : "bg-zinc-900 border-zinc-800 hover:border-purple-500/30"
                                    }`}
                                  >
                                    <span className="text-3xl">{quest.icon}</span>
                                    <div className="flex-1 min-w-0">
                                      <div className={`font-semibold ${done ? "line-through text-zinc-500" : ""}`}>
                                        {quest.title}
                                      </div>
                                      {quest.description && (
                                        <div className="text-xs text-zinc-500 truncate">{quest.description}</div>
                                      )}
                                      <span className="text-xs text-purple-400">Weekly</span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <span className="text-amber-400 font-bold text-sm">+{quest.xp_reward} XP</span>
                                      {!done && !parentMode && (
                                        <button
                                          onClick={() => handleCompleteQuest(quest)}
                                          className="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-sm font-semibold hover:bg-purple-600 transition-colors active:scale-95"
                                        >
                                          Done!
                                        </button>
                                      )}
                                      {done && <span className="text-green-500">✓</span>}
                                      {parentMode && (
                                        <button
                                          onClick={async () => {
                                            await fetch("/api/quests", {
                                              method: "DELETE",
                                              headers: { "Content-Type": "application/json" },
                                              body: JSON.stringify({ id: quest.id }),
                                            });
                                            loadData();
                                          }}
                                          className="px-2 py-1 text-red-400 hover:bg-red-500/20 rounded text-sm"
                                        >
                                          ✕
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* One-time quests */}
                      {data.quests.filter((q) => q.quest_type === "one-time").length > 0 && (
                        <div className="mt-4">
                          <h3 className="text-xs uppercase text-zinc-500 font-semibold tracking-wider mb-2 px-1">
                            Special Quests
                          </h3>
                          <div className="grid gap-2">
                            {data.quests
                              .filter((q) => q.quest_type === "one-time")
                              .map((quest) => (
                                <div
                                  key={quest.id}
                                  className="quest-card flex items-center gap-3 p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-yellow-500/30 transition-all"
                                >
                                  <span className="text-3xl">{quest.icon}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold">{quest.title}</div>
                                    {quest.description && (
                                      <div className="text-xs text-zinc-500 truncate">{quest.description}</div>
                                    )}
                                    <span className="text-xs text-yellow-400">Special</span>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className="text-amber-400 font-bold text-sm">+{quest.xp_reward} XP</span>
                                    {!parentMode && (
                                      <button
                                        onClick={() => handleCompleteQuest(quest)}
                                        className="px-3 py-1.5 bg-yellow-500 text-black rounded-lg text-sm font-semibold hover:bg-yellow-400 transition-colors active:scale-95"
                                      >
                                        Done!
                                      </button>
                                    )}
                                    {parentMode && (
                                      <button
                                        onClick={async () => {
                                          await fetch("/api/quests", {
                                            method: "DELETE",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ id: quest.id }),
                                          });
                                          loadData();
                                        }}
                                        className="px-2 py-1 text-red-400 hover:bg-red-500/20 rounded text-sm"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Pending Approvals (parent mode) */}
                  {parentMode && data.pendingApprovals.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-xs uppercase text-amber-400 font-semibold tracking-wider mb-2 px-1">
                        ⏳ Pending Approval ({data.pendingApprovals.length})
                      </h3>
                      <div className="space-y-2">
                        {data.pendingApprovals.map((c) => (
                          <div
                            key={c.id}
                            className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl"
                          >
                            <span className="text-xl">{c.child_avatar}</span>
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-sm">{c.child_name}</span>
                              <span className="text-zinc-500 text-sm"> completed </span>
                              <span className="text-sm">{c.quest_icon} {c.quest_title}</span>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleApprove(c.id, true)}
                                className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => handleApprove(c.id, false)}
                                className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Badges Tab */}
              {tab === "badges" && (
                <div>
                  <h3 className="text-lg font-bold mb-4">
                    🏅 {selectedChild.name}&apos;s Badges
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Object.entries(BADGE_DEFINITIONS).map(([key, badge]) => {
                      const earned = childBadges.some((b) => b.badge_type === key);
                      return (
                        <div
                          key={key}
                          className={`p-4 rounded-xl border text-center transition-all ${
                            earned
                              ? "bg-amber-500/10 border-amber-500/30"
                              : "bg-zinc-900 border-zinc-800 opacity-40"
                          }`}
                        >
                          <div className={`text-4xl mb-2 ${earned ? "" : "grayscale"}`}>
                            {badge.icon}
                          </div>
                          <div className="font-semibold text-sm">{badge.name}</div>
                          <div className="text-xs text-zinc-500 mt-1">{badge.description}</div>
                          {earned && (
                            <div className="text-xs text-amber-400 mt-2">Earned!</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Rewards Tab */}
              {tab === "rewards" && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">🎁 Reward Shop</h3>
                    <span className="text-amber-400 font-semibold">
                      {selectedChild.xp} XP available
                    </span>
                  </div>

                  {parentMode && (
                    <button
                      onClick={() => setShowAddReward(true)}
                      className="w-full p-4 mb-3 border-2 border-dashed border-zinc-700 rounded-xl text-zinc-500 hover:text-amber-400 hover:border-amber-500/50 transition-all"
                    >
                      + Add Reward
                    </button>
                  )}

                  {data.rewards.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500">
                      <div className="text-4xl mb-3">🎁</div>
                      <p>No rewards yet. {parentMode ? "Add some above!" : "Ask a parent to add rewards."}</p>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {data.rewards.map((reward) => {
                        const canAfford = selectedChild.xp >= reward.xp_cost;
                        return (
                          <div
                            key={reward.id}
                            className={`quest-card p-4 rounded-xl border transition-all ${
                              canAfford
                                ? "bg-zinc-900 border-zinc-800 hover:border-green-500/30"
                                : "bg-zinc-900 border-zinc-800 opacity-50"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <span className="text-3xl">{reward.icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold">{reward.title}</div>
                                {reward.description && (
                                  <div className="text-xs text-zinc-500">{reward.description}</div>
                                )}
                                <div className="text-amber-400 font-bold text-sm mt-1">
                                  {reward.xp_cost} XP
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 flex gap-2">
                              {!parentMode && (
                                <button
                                  onClick={() => handleClaimReward(reward.id)}
                                  disabled={!canAfford}
                                  className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                                >
                                  {canAfford ? "Claim!" : "Need more XP"}
                                </button>
                              )}
                              {parentMode && (
                                <button
                                  onClick={async () => {
                                    await fetch("/api/rewards", {
                                      method: "DELETE",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ id: reward.id }),
                                    });
                                    loadData();
                                  }}
                                  className="px-3 py-2 text-red-400 hover:bg-red-500/20 rounded-lg text-sm"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Pending reward claims (parent mode) */}
                  {parentMode && data.rewardClaims.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-xs uppercase text-green-400 font-semibold tracking-wider mb-2 px-1">
                        ⏳ Reward Claims Pending
                      </h3>
                      <div className="space-y-2">
                        {data.rewardClaims.map((rc) => (
                          <div
                            key={rc.id}
                            className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl"
                          >
                            <span className="text-xl">{rc.child_avatar}</span>
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-sm">{rc.child_name}</span>
                              <span className="text-zinc-500 text-sm"> wants </span>
                              <span className="text-sm">{rc.reward_icon} {rc.reward_title}</span>
                            </div>
                            <span className="text-green-400 text-sm">✓ Approved</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Leaderboard Tab */}
              {tab === "leaderboard" && (
                <div>
                  <h3 className="text-lg font-bold mb-4">🏆 Family Leaderboard</h3>
                  <div className="space-y-3">
                    {data.children
                      .sort((a, b) => b.xp - a.xp)
                      .map((child, index) => (
                        <div
                          key={child.id}
                          className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                            index === 0
                              ? "bg-yellow-500/10 border-yellow-500/20"
                              : index === 1
                              ? "bg-zinc-500/10 border-zinc-500/20"
                              : index === 2
                              ? "bg-amber-800/10 border-amber-800/20"
                              : "bg-zinc-900 border-zinc-800"
                          }`}
                        >
                          <div className="text-2xl font-bold text-zinc-500 w-8 text-center">
                            {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}`}
                          </div>
                          <span className="text-3xl">{child.avatar}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold">{child.name}</div>
                            <div className="text-sm text-zinc-500">Level {child.level}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-amber-400 font-bold text-lg">
                              {child.xp} XP
                            </div>
                            <div className="text-xs text-zinc-600">
                              {data.badges.filter((b) => b.child_id === child.id).length} badges
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowPinModal(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">🔒 Enter Parent PIN</h3>
            <input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && verifyPin()}
              placeholder="Enter PIN"
              maxLength={6}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-center text-2xl tracking-widest focus:outline-none focus:border-amber-500"
              autoFocus
            />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowPinModal(false)} className="flex-1 py-3 bg-zinc-800 text-zinc-400 rounded-xl hover:bg-zinc-700">
                Cancel
              </button>
              <button onClick={verifyPin} className="flex-1 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600">
                Unlock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Child Modal */}
      {showAddChild && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowAddChild(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">👶 Add Adventurer</h3>
            <input
              type="text"
              value={newChildName}
              onChange={(e) => setNewChildName(e.target.value)}
              placeholder="Child's name"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-amber-500 mb-3"
              autoFocus
            />
            <div className="mb-3">
              <label className="text-sm text-zinc-400 block mb-2">Choose Avatar</label>
              <div className="grid grid-cols-8 gap-2">
                {AVATARS.map((a) => (
                  <button
                    key={a}
                    onClick={() => setNewChildAvatar(a)}
                    className={`text-2xl p-1 rounded-lg transition-all ${
                      newChildAvatar === a ? "bg-amber-500/30 ring-2 ring-amber-500" : "hover:bg-zinc-800"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAddChild(false)} className="flex-1 py-3 bg-zinc-800 text-zinc-400 rounded-xl hover:bg-zinc-700">
                Cancel
              </button>
              <button onClick={handleAddChild} className="flex-1 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600">
                Add {newChildAvatar}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Quest Modal */}
      {showAddQuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowAddQuest(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">📜 Create Quest</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={newQuest.title}
                onChange={(e) => setNewQuest({ ...newQuest, title: e.target.value })}
                placeholder="Quest name (e.g. Make your bed)"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                autoFocus
              />
              <input
                type="text"
                value={newQuest.description}
                onChange={(e) => setNewQuest({ ...newQuest, description: e.target.value })}
                placeholder="Description (optional)"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
              />
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-sm text-zinc-400 block mb-1">XP Reward</label>
                  <input
                    type="number"
                    value={newQuest.xp_reward}
                    onChange={(e) => setNewQuest({ ...newQuest, xp_reward: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm text-zinc-400 block mb-1">Type</label>
                  <select
                    value={newQuest.quest_type}
                    onChange={(e) => setNewQuest({ ...newQuest, quest_type: e.target.value })}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="one-time">One-time</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm text-zinc-400 block mb-2">Icon</label>
                <div className="grid grid-cols-8 gap-2">
                  {QUEST_ICONS.map((ic) => (
                    <button
                      key={ic}
                      onClick={() => setNewQuest({ ...newQuest, icon: ic })}
                      className={`text-2xl p-1 rounded-lg transition-all ${
                        newQuest.icon === ic ? "bg-amber-500/30 ring-2 ring-amber-500" : "hover:bg-zinc-800"
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowAddQuest(false)} className="flex-1 py-3 bg-zinc-800 text-zinc-400 rounded-xl hover:bg-zinc-700">
                Cancel
              </button>
              <button onClick={handleAddQuest} className="flex-1 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600">
                Create Quest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Reward Modal */}
      {showAddReward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowAddReward(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">🎁 Create Reward</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={newReward.title}
                onChange={(e) => setNewReward({ ...newReward, title: e.target.value })}
                placeholder="Reward name (e.g. Extra screen time)"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                autoFocus
              />
              <input
                type="text"
                value={newReward.description}
                onChange={(e) => setNewReward({ ...newReward, description: e.target.value })}
                placeholder="Description (optional)"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
              />
              <div>
                <label className="text-sm text-zinc-400 block mb-1">XP Cost</label>
                <input
                  type="number"
                  value={newReward.xp_cost}
                  onChange={(e) => setNewReward({ ...newReward, xp_cost: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowAddReward(false)} className="flex-1 py-3 bg-zinc-800 text-zinc-400 rounded-xl hover:bg-zinc-700">
                Cancel
              </button>
              <button onClick={handleAddReward} className="flex-1 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600">
                Create Reward
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
