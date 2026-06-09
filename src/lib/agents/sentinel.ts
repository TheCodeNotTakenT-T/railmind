import { generateText, tool } from "ai";
import { groq } from "@ai-sdk/groq";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase";
import { TOOL_IMPLEMENTATIONS } from "./tools/railway-tools";
import { AgentInput, AgentOutput } from "./types";

interface SentinelAnalysis {
  severity: "low" | "medium" | "high" | "critical";
  reasoning: string;
  estimatedCascadeTrains: number;
  timeToImpact: number;
  recommendAnalysis: boolean;
  affectedStation: string;
  trainName: string;
}

const SENTINEL_SYSTEM_PROMPT = `
You are the Sentinel Agent for RailMind, India's autonomous railway operations 
intelligence system. You analyze delayed trains and determine cascade risk severity.

INDIAN RAILWAY CONTEXT:
- India runs 14,000+ trains daily across 68,000 route km
- Major junctions (NDLS, HWH, CSTM, MAS, PNBE, CNB, SBC, SC) handle 15-20 trains/hour
- A delay at a major junction cascades to 3-8 downstream trains within 30 minutes
- Premium trains (Rajdhani, Shatabdi, Duronto) carry 800-1200 passengers, 
  their delays cause cascades because other trains hold for connections
- Crew crossovers happen at junctions — a delayed train means delayed crew 
  for the NEXT train that crew was supposed to operate

SEVERITY CLASSIFICATION RULES:
- CRITICAL: delay > 20 min AND (major junction OR premium train) 
  → immediate intervention required, cascade imminent in < 20 min
- HIGH: delay 15-25 min OR major junction with delay > 10 min 
  → cascade likely in 20-40 min without action
- MEDIUM: delay 8-15 min at medium-traffic station 
  → monitor closely, prepare contingency
- LOW: delay < 8 min OR isolated small station with single track 
  → self-correcting, no cascade risk

MAJOR JUNCTIONS (always HIGH/CRITICAL if delayed there):
NDLS (New Delhi), HWH (Howrah), CSTM (Mumbai CSMT), BCT (Mumbai Central),
MAS (Chennai Central), SBC (Bangalore City), PNBE (Patna Jn), CNB (Kanpur),
SC (Secunderabad), DDU (Pt DD Upadhyaya), NGP (Nagpur), BPL (Bhopal)

TOOL USAGE INSTRUCTIONS:
1. ALWAYS call get_train_status first to understand the delayed train
2. ALWAYS call get_station_schedule to see what other trains are at the same station
3. ALWAYS call get_track_occupancy to understand how congested the section is
4. Use the data from tools — do not guess or make up numbers

OUTPUT FORMAT — respond with ONLY this JSON object, no other text:
{
  "severity": "low|medium|high|critical",
  "reasoning": "2-3 specific sentences referencing the actual train name, station, delay, and number of trains at risk",
  "estimatedCascadeTrains": <number based on track occupancy data>,
  "timeToImpact": <minutes until cascade unrecoverable, based on station schedule data>,
  "recommendAnalysis": <true if severity is medium/high/critical, false if low>,
  "affectedStation": "<station code from route>",
  "trainName": "<actual train name from DB>"
}
`;

export class SentinelAgent {
  async run(input: AgentInput): Promise<AgentOutput> {
    const supabase = createServerSupabaseClient();
    const startTime = Date.now();

    // Log start to agent_logs
    const { data: logEntry, error: logError } = await supabase
      .from("agent_logs")
      .insert({
        agent_name: "Sentinel",
        action: "Analyzing delay severity",
        input: input as any,
        output: null,
        duration_ms: null,
        incident_id: input.incidentId,
      })
      .select("id")
      .single();

    if (logError) {
      console.error("Warning: Failed to initialize Sentinel agent log:", logError.message);
    }

    try {
      // Fetch the incident to get trigger_train_id and delay_minutes
      const { data: incident, error: incidentError } = await supabase
        .from("incidents")
        .select("*")
        .eq("id", input.incidentId)
        .single();

      if (incidentError || !incident) {
        throw new Error(incidentError?.message || "Incident not found");
      }

      const trainId = incident.trigger_train_id;
      const delayMinutes = incident.delay_minutes;

      // Build the user prompt with specific context
      const userPrompt = `
Analyze this railway delay and determine cascade risk:

Train ID: ${trainId}
Reported delay: ${delayMinutes} minutes
Incident ID: ${input.incidentId}

Use your tools to:
1. Get the full status of train ${trainId}
2. Check the station schedule at the train's current location
3. Check track occupancy to see how many trains are nearby

Then output your severity assessment as a JSON object.
`;

      // Define tools with zod schemas
      const tools = {
        get_train_status: tool({
          description: "Get current status and position of a train by its ID",
          parameters: z.object({ train_id: z.string() }),
          execute: async ({ train_id }) => {
            return await TOOL_IMPLEMENTATIONS.get_train_status({ train_id });
          },
        }),
        get_station_schedule: tool({
          description: "Get trains currently at or approaching a station within a time window",
          parameters: z.object({
            station_code: z.string(),
            time_window_minutes: z.number(),
          }),
          execute: async ({ station_code, time_window_minutes }) => {
            return await TOOL_IMPLEMENTATIONS.get_station_schedule({
              station_code,
              time_window_minutes,
            });
          },
        }),
        get_track_occupancy: tool({
          description: "Get the number of trains currently approaching or on a track section near a station",
          parameters: z.object({ station_code: z.string() }),
          execute: async ({ station_code }) => {
            return await TOOL_IMPLEMENTATIONS.get_track_occupancy({ station_code });
          },
        }),
      };

      // STEP 1 — Tool gathering (collect data using tools):
      const { steps } = await generateText({
        model: groq('llama-3.3-70b-versatile'),
        system: SENTINEL_SYSTEM_PROMPT,
        prompt: userPrompt,
        tools,
        maxSteps: 4,
        temperature: 0.2,
      });

      // Extract all tool results from steps
      const toolResultsSummary = steps
        .flatMap(step => step.toolResults || [])
        .map(tr => `Tool: ${tr.toolName}\nResult: ${JSON.stringify(tr.result)}`)
        .join('\n\n');

      // STEP 2 — Structured output (no tools, just JSON):
      const { text: jsonText } = await generateText({
        model: groq('llama-3.3-70b-versatile'),
        system: 'You output ONLY valid JSON. No markdown. No explanation. Just the JSON object.',
        prompt: `Based on this railway data:\n\n${toolResultsSummary}\n\nTrain ${trainId} is delayed ${delayMinutes} minutes.\n\nOutput this exact JSON:\n{"severity":"critical|high|medium|low","reasoning":"specific 2-3 sentences mentioning train name, station, and impact","estimatedCascadeTrains":NUMBER,"timeToImpact":NUMBER,"recommendAnalysis":true|false,"affectedStation":"STATION_CODE","trainName":"TRAIN_NAME"}`,
        temperature: 0.1,
      });

      // Parse JSON from response
      // Strip any markdown code blocks if present
      const cleanText = jsonText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      let analysis: SentinelAnalysis;
      try {
        analysis = JSON.parse(cleanText);
      } catch (parseError) {
        // If JSON parse fails, extract JSON from text using regex
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("Sentinel did not return valid JSON: " + cleanText.slice(0, 200));
        }
        analysis = JSON.parse(jsonMatch[0]);
      }

      // Validate required fields
      if (!analysis.severity || !analysis.reasoning) {
        throw new Error("Sentinel output missing required fields");
      }

      // Store analysis in incidents table
      const { error: updateIncidentError } = await supabase
        .from("incidents")
        .update({
          sentinel_analysis: analysis as any,
          severity: analysis.severity,
        })
        .eq("id", input.incidentId);

      if (updateIncidentError) {
        console.error("Warning: Failed to update incident with Sentinel analysis:", updateIncidentError.message);
      }

      const duration = Date.now() - startTime;

      const output: AgentOutput = {
        success: true,
        data: { analysis },
        summary: `Severity: ${analysis.severity.toUpperCase()} — ${analysis.reasoning.slice(0, 150)}`,
      };

      // Update agent log with result
      if (logEntry?.id) {
        const { error: updateLogError } = await supabase
          .from("agent_logs")
          .update({
            action: `Sentinel: ${analysis.severity.toUpperCase()} — ${
              analysis.recommendAnalysis ? "Cascade analysis needed" : "No cascade risk"
            }`,
            output: output as any,
            duration_ms: duration,
          })
          .eq("id", logEntry.id);

        if (updateLogError) {
          console.error("Warning: Failed to update Sentinel agent log with result:", updateLogError.message);
        }
      }

      console.log(
        `🔍 Sentinel: ${analysis.severity.toUpperCase()} | ${analysis.trainName} | Cascade trains: ${
          analysis.estimatedCascadeTrains
        } | Time to impact: ${analysis.timeToImpact}min`
      );

      return output;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const failOutput: AgentOutput = {
        success: false,
        data: { analysis: { severity: "medium", recommendAnalysis: true } },
        summary: "Sentinel failed — defaulting to medium severity",
        error: error.message,
      };

      console.error("❌ Sentinel Agent failed:", error.message);

      if (logEntry?.id) {
        await supabase
          .from("agent_logs")
          .update({
            action: "Sentinel FAILED — using default medium",
            output: failOutput as any,
            duration_ms: duration,
          })
          .eq("id", logEntry.id);
      }

      return failOutput;
    }
  }
}

export const sentinelAgent = new SentinelAgent();
