export const maxDuration = 120;

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { orchestrator } from "@/lib/agents/orchestrator";

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

    // Call the orchestrator to run the analysis pipeline
    await orchestrator.handleIncident(incidentId);

    return NextResponse.json({
      success: true,
      summary: "Orchestrator analysis completed",
      incidentId,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
