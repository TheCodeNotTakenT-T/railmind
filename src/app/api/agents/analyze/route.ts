export const maxDuration = 120;

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { incidentId } = body;
    if (!incidentId) {
      return NextResponse.json({ error: "Missing incidentId" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Check if incident exists in DB
    const { data: incident, error: findError } = await supabase
      .from("incidents")
      .select("*")
      .eq("id", incidentId)
      .maybeSingle();

    if (findError) {
      return NextResponse.json({ error: findError.message }, { status: 500 });
    }

    if (!incident) {
      return NextResponse.json({ error: `Incident not found: ${incidentId}` }, { status: 404 });
    }

    // Update incident status to 'analyzing'
    const { error: updateError } = await supabase
      .from("incidents")
      .update({ status: "analyzing" })
      .eq("id", incidentId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Insert a placeholder agent_log entry
    const { error: logError } = await supabase.from("agent_logs").insert({
      agent_name: "Orchestrator",
      action: "Pipeline initiated — agents not yet built (Day 3)",
      input: { incidentId },
      output: { status: "stub" },
      duration_ms: 0,
      incident_id: incidentId,
    });

    if (logError) {
      console.error("Warning: failed to create agent log in analyze stub:", logError.message);
    }

    return NextResponse.json({
      success: true,
      summary: "Agent pipeline stub — full implementation in Day 3",
      incidentId,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
