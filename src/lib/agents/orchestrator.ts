import { createServerSupabaseClient } from "@/lib/supabase";
import { sentinelAgent } from "./sentinel";
import { cascadeAnalyzerAgent } from "./cascade-analyzer";

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

    // STAGE 2: Cascade Analysis
    console.log('🔗 Stage 2: Cascade Analyzer...')
    const cascadeOutput = await cascadeAnalyzerAgent.run({
      incidentId,
      context: {
        sentinelAnalysis: sentinelOutput.data?.analysis,
        trigger_train_id: incident.trigger_train_id
      }
    })
    console.log(`✅ Stage 2 complete: ${cascadeOutput.summary}`)

    // Stages 3-4 still coming (Resolution + Communication)
    await supabase
      .from('incidents')
      .update({ status: 'active' })
      .eq('id', incidentId)

    // Log entry for orchestrator
    await supabase.from("agent_logs").insert({
      agent_name: "Orchestrator",
      action: "Stage 2 (Cascade) complete — waiting for next stages",
      input: { incidentId },
      output: { sentinelOutput, cascadeOutput, status: "active" },
      duration_ms: 0,
      incident_id: incidentId,
    });
  }
}

export const orchestrator = new Orchestrator();
