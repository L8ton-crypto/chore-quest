import { getDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Verify family PIN for parent mode
export async function POST(req: NextRequest) {
  try {
    const { family_id, pin } = await req.json();
    if (!family_id || !pin) {
      return NextResponse.json({ error: "family_id and pin required" }, { status: 400 });
    }

    const sql = getDB();
    const [family] = await sql`SELECT pin FROM cq_families WHERE id = ${family_id}`;
    if (!family) return NextResponse.json({ error: "Family not found" }, { status: 404 });

    return NextResponse.json({ valid: family.pin === pin });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
