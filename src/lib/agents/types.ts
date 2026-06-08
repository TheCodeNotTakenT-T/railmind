export interface AgentInput {
  incidentId: string;
  context: Record<string, unknown>;
}

export interface AgentOutput {
  success: boolean;
  data: Record<string, unknown>;
  summary: string;
  error?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: object;
}
