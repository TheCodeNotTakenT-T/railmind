import { createServerSupabaseClient } from "@/lib/supabase";

export class Orchestrator {
  async handleIncident(incidentId: string): Promise<void> {
    const supabase = createServerSupabaseClient();
    
    // Load incident
    const { data: incident, error } = await supabase
      .from("incidents")
      .select("*")
      .eq("id", incidentId)
      .maybeSingle();

    if (error || !incident) {
      throw new Error("Incident not found: " + incidentId);
    }

    // Update status to analyzing in Supabase
    const { error: updateError } = await supabase
      .from("incidents")
      .update({ status: "analyzing" })
      .eq("id", incidentId);

    if (updateError) {
      console.error(`Orchestrator failed to transition incident to analyzing: ${updateError.message}`);
    }

    console.log(`🤖 Orchestrator: Starting pipeline for incident ${incidentId}`);
    console.log(`   Train: ${incident.trigger_train_id} | Delay: ${incident.delay_minutes} min`);

    // PIPELINE STAGES (agents will be added here as they're built):
    // Stage 1: Sentinel (Phase 3.2)
    // Stage 2: Cascade Analyzer (Phase 3.3)
    // Stage 3: Resolution (Phase 3.4)
    // Stage 4: Communication (Phase 3.5)

    // For now, log a placeholder entry
    const { error: logError } = await supabase.from("agent_logs").insert({
      agent_name: "Orchestrator",
      action: "Pipeline scaffolded — agents being added",
      input: { incidentId },
      output: { stages_completed: 0, total_stages: 4 },
      duration_ms: 0,
      incident_id: incidentId,
    });

    if (logError) {
      console.error(`Orchestrator failed to insert audit log: ${logError.message}`);
    }

    console.log("✅ Orchestrator scaffold complete");
  }
}

export const orchestrator = new Orchestrator();
