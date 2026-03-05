import { getDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getLevelFromXP, BADGE_DEFINITIONS } from "@/lib/types";

// Complete a quest (child submits)
export async function POST(req: NextRequest) {
  try {
    const { quest_id, child_id } = await req.json();
    if (!quest_id || !child_id) {
      return NextResponse.json({ error: "quest_id and child_id required" }, { status: 400 });
    }

    const sql = getDB();

    // Check if quest exists
    const [quest] = await sql`SELECT * FROM cq_quests WHERE id = ${quest_id}`;
    if (!quest) return NextResponse.json({ error: "Quest not found" }, { status: 404 });

    // Check for duplicate daily completion
    if (quest.quest_type === "daily") {
      const existing = await sql`
        SELECT id FROM cq_completions 
        WHERE quest_id = ${quest_id} AND child_id = ${child_id} 
        AND completed_at >= CURRENT_DATE
      `;
      if (existing.length > 0) {
        return NextResponse.json({ error: "Already completed today" }, { status: 400 });
      }
    }

    // Check for duplicate weekly completion
    if (quest.quest_type === "weekly") {
      const existing = await sql`
        SELECT id FROM cq_completions 
        WHERE quest_id = ${quest_id} AND child_id = ${child_id} 
        AND completed_at >= date_trunc('week', CURRENT_DATE)
      `;
      if (existing.length > 0) {
        return NextResponse.json({ error: "Already completed this week" }, { status: 400 });
      }
    }

    // Create completion record
    const [completion] = await sql`
      INSERT INTO cq_completions (quest_id, child_id)
      VALUES (${quest_id}, ${child_id})
      RETURNING *
    `;

    // Award XP immediately (can be revoked if not approved)
    const [child] = await sql`
      UPDATE cq_children SET xp = xp + ${quest.xp_reward}
      WHERE id = ${child_id}
      RETURNING *
    `;

    // Check for level up
    const newLevel = getLevelFromXP(child.xp);
    let leveledUp = false;
    if (newLevel > child.level) {
      await sql`UPDATE cq_children SET level = ${newLevel} WHERE id = ${child_id}`;
      leveledUp = true;
    }

    // Check and award badges
    const newBadges: string[] = [];
    const existingBadges = await sql`SELECT badge_type FROM cq_badges WHERE child_id = ${child_id}`;
    const hasBadge = (type: string) => existingBadges.some((b) => b.badge_type === type);

    // First Quest badge
    if (!hasBadge("first_quest")) {
      await sql`INSERT INTO cq_badges (child_id, badge_type) VALUES (${child_id}, 'first_quest') ON CONFLICT DO NOTHING`;
      newBadges.push("first_quest");
    }

    // Helper badge (10 quests)
    const totalCompletions = await sql`SELECT COUNT(*) as count FROM cq_completions WHERE child_id = ${child_id}`;
    if (Number(totalCompletions[0].count) >= 10 && !hasBadge("helper")) {
      await sql`INSERT INTO cq_badges (child_id, badge_type) VALUES (${child_id}, 'helper') ON CONFLICT DO NOTHING`;
      newBadges.push("helper");
    }

    // Quest Master badge (50 quests)
    if (Number(totalCompletions[0].count) >= 50 && !hasBadge("quest_master")) {
      await sql`INSERT INTO cq_badges (child_id, badge_type) VALUES (${child_id}, 'quest_master') ON CONFLICT DO NOTHING`;
      newBadges.push("quest_master");
    }

    // Speed Runner (5 in one day)
    const todayCount = await sql`
      SELECT COUNT(*) as count FROM cq_completions 
      WHERE child_id = ${child_id} AND completed_at >= CURRENT_DATE
    `;
    if (Number(todayCount[0].count) >= 5 && !hasBadge("speed_runner")) {
      await sql`INSERT INTO cq_badges (child_id, badge_type) VALUES (${child_id}, 'speed_runner') ON CONFLICT DO NOTHING`;
      newBadges.push("speed_runner");
    }

    // Level badges
    if (newLevel >= 5 && !hasBadge("level_5")) {
      await sql`INSERT INTO cq_badges (child_id, badge_type) VALUES (${child_id}, 'level_5') ON CONFLICT DO NOTHING`;
      newBadges.push("level_5");
    }
    if (newLevel >= 10 && !hasBadge("level_10")) {
      await sql`INSERT INTO cq_badges (child_id, badge_type) VALUES (${child_id}, 'level_10') ON CONFLICT DO NOTHING`;
      newBadges.push("level_10");
    }

    // Badge collector (5 badges)
    const totalBadges = await sql`SELECT COUNT(*) as count FROM cq_badges WHERE child_id = ${child_id}`;
    if (Number(totalBadges[0].count) >= 5 && !hasBadge("badge_collector")) {
      await sql`INSERT INTO cq_badges (child_id, badge_type) VALUES (${child_id}, 'badge_collector') ON CONFLICT DO NOTHING`;
      newBadges.push("badge_collector");
    }

    return NextResponse.json({
      completion,
      xpEarned: quest.xp_reward,
      totalXP: child.xp,
      leveledUp,
      newLevel: leveledUp ? newLevel : child.level,
      newBadges: newBadges.map((b) => ({
        type: b,
        ...BADGE_DEFINITIONS[b],
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
