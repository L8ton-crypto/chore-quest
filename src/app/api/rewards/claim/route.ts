import { getDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Claim a reward (child spends XP)
export async function POST(req: NextRequest) {
  try {
    const { reward_id, child_id } = await req.json();
    if (!reward_id || !child_id) {
      return NextResponse.json({ error: "reward_id and child_id required" }, { status: 400 });
    }

    const sql = getDB();

    const [reward] = await sql`SELECT * FROM cq_rewards WHERE id = ${reward_id}`;
    if (!reward) return NextResponse.json({ error: "Reward not found" }, { status: 404 });

    const [child] = await sql`SELECT * FROM cq_children WHERE id = ${child_id}`;
    if (!child) return NextResponse.json({ error: "Child not found" }, { status: 404 });

    if (child.xp < reward.xp_cost) {
      return NextResponse.json({ error: "Not enough XP" }, { status: 400 });
    }

    // Deduct XP and create claim
    await sql`UPDATE cq_children SET xp = xp - ${reward.xp_cost} WHERE id = ${child_id}`;
    const [claim] = await sql`
      INSERT INTO cq_reward_claims (reward_id, child_id)
      VALUES (${reward_id}, ${child_id})
      RETURNING *
    `;

    return NextResponse.json({ claim, xpSpent: reward.xp_cost });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
