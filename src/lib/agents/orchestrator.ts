import { createServerSupabaseClient } from "@/lib/supabase";
import { sentinelAgent } from "./sentinel";

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

    // STAGE 1: Sentinel Analysis
    console.log("📡 Stage 1: Sentinel Agent...");
    const sentinelOutput = await sentinelAgent.run({
      incidentId,
      context: { trigger_train_id: incident.trigger_train_id, delay_minutes: incident.delay_minutes },
    });

    const analysis = sentinelOutput.data?.analysis as any;

    if (!sentinelOutput.success || !analysis?.recommendAnalysis) {
      // Low severity or agent failed — close incident without cascade analysis
      await supabase
        .from("incidents")
        .update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
        })
        .eq("id", incidentId);

      await supabase.from("agent_logs").insert({
        agent_name: "Orchestrator",
        action: "Pipeline complete: Low severity — incident resolved",
        input: { incidentId },
        output: { sentinelOutput, status: "resolved" },
        duration_ms: 0,
        incident_id: incidentId,
      });

      console.log("✅ Orchestrator: Low severity — incident closed without cascade analysis");
      return;
    }

    console.log(`✅ Stage 1 complete: ${analysis.severity} severity — proceeding to cascade analysis`);

    // Stages 2-4 will be added in phases 3.3-3.5
    // For now update status back to active (analyzed by sentinel but waiting for cascade)
    await supabase
      .from("incidents")
      .update({ status: "active" })
      .eq("id", incidentId);

    // Log entry for orchestrator
    await supabase.from("agent_logs").insert({
      agent_name: "Orchestrator",
      action: "Stage 1 (Sentinel) complete — waiting for next stages",
      input: { incidentId },
      output: { sentinelOutput, status: "active" },
      duration_ms: 0,
      incident_id: incidentId,
    });
  }
}

export const orchestrator = new Orchestrator();
