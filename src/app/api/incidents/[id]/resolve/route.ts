import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { simulationEngine } from "@/lib/simulation/engine";

function determineStatus(delayMinutes: number): "on_time" | "delayed" | "critical" {
  if (delayMinutes < 5) return "on_time";
  if (delayMinutes <= 30) return "delayed";
  return "critical";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { resolutionIndex } = body;

    // Validate resolutionIndex (must be 0, 1, or 2)
    if (
      resolutionIndex === undefined ||
      resolutionIndex === null ||
      ![0, 1, 2].includes(Number(resolutionIndex))
    ) {
      return NextResponse.json(
        { error: "Invalid or missing resolutionIndex. Must be 0, 1, or 2." },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Fetch incident to get resolution options and trigger train id
    const { data: incident, error: fetchError } = await supabase
      .from("incidents")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!incident || incident.status === "resolved") {
      return NextResponse.json(
        { error: "Incident not found or already resolved" },
        { status: 400 }
      );
    }

    const resolutionOptions = incident.resolution_options || [];
    const selectedResolution = resolutionOptions[Number(resolutionIndex)] || { index: Number(resolutionIndex) };

    const resolvedAt = new Date().toISOString();

    // Update incident in Supabase
    const { error: updateIncidentError } = await supabase
      .from("incidents")
      .update({
        status: "resolved",
        resolved_at: resolvedAt,
        resolution_applied: selectedResolution,
      })
      .eq("id", id);

    if (updateIncidentError) {
      return NextResponse.json({ error: updateIncidentError.message }, { status: 500 });
    }

    // Calculate new delay and status for the trigger train
    const newDelay = Math.max(0, Math.floor(incident.delay_minutes / 2));
    const newStatus = determineStatus(newDelay);
    const updatedAt = new Date().toISOString();

    // Update trigger train in Supabase
    const { error: updateTrainError } = await supabase
      .from("trains")
      .update({
        delay_minutes: newDelay,
        status: newStatus,
        updated_at: updatedAt,
      })
      .eq("id", incident.trigger_train_id);

    if (updateTrainError) {
      return NextResponse.json({ error: updateTrainError.message }, { status: 500 });
    }

    // Try to update the trainState in the simulationEngine's in-memory map
    try {
      const engineAsAny = simulationEngine as any;
      if (engineAsAny.trainStates && engineAsAny.trainStates.has(incident.trigger_train_id)) {
        const memoryTrain = engineAsAny.trainStates.get(incident.trigger_train_id);
        if (memoryTrain) {
          memoryTrain.delay_minutes = newDelay;
          memoryTrain.status = newStatus;
          memoryTrain.updated_at = updatedAt;
        }
      }
    } catch (memoryErr) {
      console.warn("Failed to update simulation engine memory directly:", memoryErr);
    }

    // Insert Agent Log
    const { error: logError } = await supabase.from("agent_logs").insert({
      agent_name: "Orchestrator",
      action: "Resolution applied by operator",
      input: { resolutionIndex, incidentId: id },
      output: { selectedResolution },
      duration_ms: 0,
      incident_id: id,
    });

    if (logError) {
      console.error("Warning: failed to create resolution agent log:", logError.message);
    }

    return NextResponse.json({
      success: true,
      message: "Resolution applied",
      resolution: selectedResolution,
      incidentId: id,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
