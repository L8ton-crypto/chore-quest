import { getDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Create quest
export async function POST(req: NextRequest) {
  try {
    const { family_id, title, description, xp_reward, quest_type, icon } = await req.json();
    if (!family_id || !title) {
      return NextResponse.json({ error: "family_id and title required" }, { status: 400 });
    }

    const sql = getDB();
    const rows = await sql`
      INSERT INTO cq_quests (family_id, title, description, xp_reward, quest_type, icon)
      VALUES (${family_id}, ${title}, ${description || ""}, ${xp_reward || 10}, ${quest_type || "daily"}, ${icon || "⭐"})
      RETURNING *
    `;
    return NextResponse.json(rows[0]);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// Delete quest
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const sql = getDB();
    await sql`DELETE FROM cq_quests WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
