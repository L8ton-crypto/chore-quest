import { getDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Add child to family
export async function POST(req: NextRequest) {
  try {
    const { family_id, name, avatar } = await req.json();
    if (!family_id || !name) {
      return NextResponse.json({ error: "family_id and name required" }, { status: 400 });
    }

    const sql = getDB();
    const rows = await sql`
      INSERT INTO cq_children (family_id, name, avatar)
      VALUES (${family_id}, ${name}, ${avatar || "🦁"})
      RETURNING *
    `;
    return NextResponse.json(rows[0]);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// Delete child
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const sql = getDB();
    await sql`DELETE FROM cq_children WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
