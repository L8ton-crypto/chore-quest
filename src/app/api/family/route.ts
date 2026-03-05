import { getDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Create family
export async function POST(req: NextRequest) {
  try {
    const { name, pin } = await req.json();
    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

    const sql = getDB();
    const rows = await sql`
      INSERT INTO cq_families (name, pin) 
      VALUES (${name}, ${pin || "1234"}) 
      RETURNING *
    `;
    return NextResponse.json(rows[0]);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// List all families (for joining)
export async function GET() {
  try {
    const sql = getDB();
    const rows = await sql`SELECT id, name, created_at FROM cq_families ORDER BY created_at DESC`;
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
