import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();

    // Query 1: Fetch the incident
    const { data: incident, error: incidentError } = await supabase
      .from("incidents")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (incidentError) {
      return NextResponse.json({ error: incidentError.message }, { status: 500 });
    }

    if (!incident) {
      return NextResponse.json({ error: `Incident not found: ${id}` }, { status: 404 });
    }

    // Query 2: Fetch related notifications
    const { data: notifications, error: notificationsError } = await supabase
      .from("notifications")
      .select("*")
      .eq("incident_id", id)
      .order("created_at", { ascending: true });

    if (notificationsError) {
      return NextResponse.json({ error: notificationsError.message }, { status: 500 });
    }

    // Query 3: Fetch related agent logs
    const { data: agentLogs, error: agentLogsError } = await supabase
      .from("agent_logs")
      .select("*")
      .eq("incident_id", id)
      .order("created_at", { ascending: true });

    if (agentLogsError) {
      return NextResponse.json({ error: agentLogsError.message }, { status: 500 });
    }

    return NextResponse.json({
      incident,
      notifications: notifications || [],
      agentLogs: agentLogs || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
