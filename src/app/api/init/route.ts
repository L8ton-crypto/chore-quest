import { getDB } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const sql = getDB();

    await sql`
      CREATE TABLE IF NOT EXISTS cq_families (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name TEXT NOT NULL,
        pin TEXT NOT NULL DEFAULT '1234',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS cq_children (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        family_id TEXT NOT NULL REFERENCES cq_families(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        avatar TEXT NOT NULL DEFAULT '🦁',
        xp INTEGER NOT NULL DEFAULT 0,
        level INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS cq_quests (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        family_id TEXT NOT NULL REFERENCES cq_families(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        xp_reward INTEGER NOT NULL DEFAULT 10,
        quest_type TEXT NOT NULL DEFAULT 'daily',
        icon TEXT NOT NULL DEFAULT '⭐',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS cq_completions (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        quest_id TEXT NOT NULL REFERENCES cq_quests(id) ON DELETE CASCADE,
        child_id TEXT NOT NULL REFERENCES cq_children(id) ON DELETE CASCADE,
        completed_at TIMESTAMP DEFAULT NOW(),
        approved BOOLEAN DEFAULT false,
        approved_at TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS cq_badges (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        child_id TEXT NOT NULL REFERENCES cq_children(id) ON DELETE CASCADE,
        badge_type TEXT NOT NULL,
        earned_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(child_id, badge_type)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS cq_rewards (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        family_id TEXT NOT NULL REFERENCES cq_families(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        xp_cost INTEGER NOT NULL DEFAULT 100,
        icon TEXT NOT NULL DEFAULT '🎁',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS cq_reward_claims (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        reward_id TEXT NOT NULL REFERENCES cq_rewards(id) ON DELETE CASCADE,
        child_id TEXT NOT NULL REFERENCES cq_children(id) ON DELETE CASCADE,
        claimed_at TIMESTAMP DEFAULT NOW(),
        approved BOOLEAN DEFAULT false
      )
    `;

    return NextResponse.json({ success: true, message: "All tables created" });
  } catch (error) {
    console.error("Init error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
