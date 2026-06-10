import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    // Query notifications join incidents to get train details
    const { data, count, error } = await supabase
      .from("notifications")
      .select(`
        *,
        incidents:incident_id (
          trigger_train_id,
          delay_minutes
        )
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Flatten/map structure so incident details are top-level on notifications object
    const notifications = (data || []).map((n: any) => ({
      id: n.id,
      incident_id: n.incident_id,
      recipient_type: n.recipient_type,
      channel: n.channel,
      content: n.content,
      created_at: n.created_at,
      trigger_train_id: n.incidents?.trigger_train_id || null,
      delay_minutes: n.incidents?.delay_minutes || 0,
    }));

    return NextResponse.json({ notifications, total: count ?? notifications.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
