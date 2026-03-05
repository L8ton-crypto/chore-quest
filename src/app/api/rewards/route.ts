import { getDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Create reward
export async function POST(req: NextRequest) {
  try {
    const { family_id, title, description, xp_cost, icon } = await req.json();
    if (!family_id || !title) {
      return NextResponse.json({ error: "family_id and title required" }, { status: 400 });
    }

    const sql = getDB();
    const rows = await sql`
      INSERT INTO cq_rewards (family_id, title, description, xp_cost, icon)
      VALUES (${family_id}, ${title}, ${description || ""}, ${xp_cost || 100}, ${icon || "🎁"})
      RETURNING *
    `;
    return NextResponse.json(rows[0]);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// Delete reward
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const sql = getDB();
    await sql`DELETE FROM cq_rewards WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
