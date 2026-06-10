import { generateText, tool } from "ai";
import { groq } from "@ai-sdk/groq";
import { createServerSupabaseClient } from "@/lib/supabase";
import { TOOL_IMPLEMENTATIONS, TOOL_SCHEMAS } from "./tools/railway-tools";
import { AgentInput, AgentOutput } from "./types";

export abstract class BaseAgent {
  constructor(
    protected name: string,
    protected systemPrompt: string
  ) {}

  abstract buildPrompt(input: AgentInput): string;

  async run(input: AgentInput): Promise<AgentOutput> {
    const supabase = createServerSupabaseClient();
    const startTime = Date.now();

    // Log agent start in DB
    const { data: logEntry, error: logInitError } = await supabase
      .from("agent_logs")
      .insert({
        agent_name: this.name,
        action: "Agent started",
        input: input as any,
        output: null,
        duration_ms: null,
        incident_id: input.incidentId,
      })
      .select("id")
      .single();

    if (logInitError) {
      console.error(`Warning: Failed to initialize agent log for ${this.name}:`, logInitError.message);
    }

    try {
      // Build the tools map for Vercel AI SDK
      const tools: Record<string, any> = {};
      for (const schema of TOOL_SCHEMAS) {
        tools[schema.name] = tool({
          description: schema.description,
          parameters: schema.parameters,
          execute: async (params: any) => {
            const impl = TOOL_IMPLEMENTATIONS[schema.name];
            if (!impl) return { error: "Tool not found" };
            return await impl(params);
          },
        } as any);
      }

      // Call Groq Llama 3.3 70B with maximum 5 tool-calling roundtrips
      const { text, toolCalls } = await generateText({
        model: groq("llama-3.3-70b-versatile"),
        system: this.systemPrompt,
        prompt: this.buildPrompt(input),
        tools,
        maxSteps: 5,
        temperature: 0.3,
      } as any);

      const duration = Date.now() - startTime;
      const output: AgentOutput = {
        success: true,
        data: { text, toolCallsCount: toolCalls?.length || 0 },
        summary: text.slice(0, 200),
      };

      // Update log with success result
      if (logEntry?.id) {
        const { error: logUpdateError } = await supabase
          .from("agent_logs")
          .update({
            action: `${this.name} completed`,
            output: output as any,
            duration_ms: duration,
          })
          .eq("id", logEntry.id);

        if (logUpdateError) {
          console.error(`Warning: Failed to update agent log for ${this.name}:`, logUpdateError.message);
        }
      }

      return output;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const failOutput: AgentOutput = {
        success: false,
        data: {},
        summary: `${this.name} agent failed`,
        error: error.message || "Unknown execution error",
      };

      if (logEntry?.id) {
        const { error: logUpdateError } = await supabase
          .from("agent_logs")
          .update({
            action: `${this.name} FAILED`,
            output: failOutput as any,
            duration_ms: duration,
          })
          .eq("id", logEntry.id);

        if (logUpdateError) {
          console.error(`Warning: Failed to update agent log (failure log) for ${this.name}:`, logUpdateError.message);
        }
      }

      // Never throw, always fail gracefully
      return failOutput;
    }
  }
}
