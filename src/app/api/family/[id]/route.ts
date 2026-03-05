import { getDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Get full family data: children, quests, completions, badges, rewards
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sql = getDB();

    const [family] = await sql`SELECT * FROM cq_families WHERE id = ${id}`;
    if (!family) return NextResponse.json({ error: "Family not found" }, { status: 404 });

    const children = await sql`
      SELECT * FROM cq_children WHERE family_id = ${id} ORDER BY xp DESC
    `;

    const quests = await sql`
      SELECT * FROM cq_quests WHERE family_id = ${id} ORDER BY created_at DESC
    `;

    // Today's completions (for daily quest tracking)
    const todayCompletions = await sql`
      SELECT c.*, q.title as quest_title, q.icon as quest_icon, q.xp_reward as quest_xp,
             ch.name as child_name, ch.avatar as child_avatar
      FROM cq_completions c
      JOIN cq_quests q ON c.quest_id = q.id
      JOIN cq_children ch ON c.child_id = ch.id
      WHERE q.family_id = ${id}
      AND c.completed_at >= CURRENT_DATE
      ORDER BY c.completed_at DESC
    `;

    // Pending approvals
    const pendingApprovals = await sql`
      SELECT c.*, q.title as quest_title, q.icon as quest_icon, q.xp_reward as quest_xp,
             ch.name as child_name, ch.avatar as child_avatar
      FROM cq_completions c
      JOIN cq_quests q ON c.quest_id = q.id
      JOIN cq_children ch ON c.child_id = ch.id
      WHERE q.family_id = ${id} AND c.approved = false
      ORDER BY c.completed_at DESC
    `;

    // All badges for children in this family
    const badges = await sql`
      SELECT b.* FROM cq_badges b
      JOIN cq_children ch ON b.child_id = ch.id
      WHERE ch.family_id = ${id}
    `;

    const rewards = await sql`
      SELECT * FROM cq_rewards WHERE family_id = ${id} ORDER BY xp_cost ASC
    `;

    const rewardClaims = await sql`
      SELECT rc.*, r.title as reward_title, r.icon as reward_icon,
             ch.name as child_name, ch.avatar as child_avatar
      FROM cq_reward_claims rc
      JOIN cq_rewards r ON rc.reward_id = r.id
      JOIN cq_children ch ON rc.child_id = ch.id
      WHERE r.family_id = ${id} AND rc.approved = false
      ORDER BY rc.claimed_at DESC
    `;

    return NextResponse.json({
      family: { id: family.id, name: family.name, created_at: family.created_at },
      children,
      quests,
      todayCompletions,
      pendingApprovals,
      badges,
      rewards,
      rewardClaims,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
