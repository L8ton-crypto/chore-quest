import { getDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Parent approves a completion
export async function POST(req: NextRequest) {
  try {
    const { completion_id, approved } = await req.json();
    if (!completion_id) {
      return NextResponse.json({ error: "completion_id required" }, { status: 400 });
    }

    const sql = getDB();

    if (approved === false) {
      // Reject: remove XP and delete completion
      const [completion] = await sql`
        SELECT c.*, q.xp_reward FROM cq_completions c
        JOIN cq_quests q ON c.quest_id = q.id
        WHERE c.id = ${completion_id}
      `;
      if (completion) {
        await sql`
          UPDATE cq_children SET xp = GREATEST(0, xp - ${completion.xp_reward})
          WHERE id = ${completion.child_id}
        `;
        await sql`DELETE FROM cq_completions WHERE id = ${completion_id}`;
      }
      return NextResponse.json({ success: true, action: "rejected" });
    }

    // Approve
    await sql`
      UPDATE cq_completions SET approved = true, approved_at = NOW()
      WHERE id = ${completion_id}
    `;

    return NextResponse.json({ success: true, action: "approved" });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
