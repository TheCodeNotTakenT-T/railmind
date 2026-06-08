export interface CascadeTrain {
  id: string;
  name: string;
  estimatedDelay: number;
  reason: string;
  level: 1 | 2;
}

export interface CascadeImpact {
  cascadeTrains: CascadeTrain[];
  passengersAffected: number;
  totalCascadeMinutes: number;
  timeToImpact: number;
  conflictDetails: string[];
}

export interface ResolutionOption {
  title: string;
  description: string;
  immediateActions: string[];
  estimatedDelayReduction: number;
  tradeoffs: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface GeneratedNotifications {
  passengerSMS: string;
  stationMasterBrief: string[];
  crewAlert: string;
}

export interface Train {
  id: string;
  name: string;
  number: string;
  origin: string;
  destination: string;
  route: string[];
  current_lat: number;
  current_lng: number;
  current_station_index: number;
  scheduled_arrival: string;
  actual_arrival: string | null;
  delay_minutes: number;
  status: "on_time" | "delayed" | "critical";
  passengers: number;
  updated_at: string;
}

export interface Station {
  id: string;
  name: string;
  code: string;
  lat: number;
  lng: number;
  zone: string;
  platforms: number;
}

export interface Incident {
  id: string;
  trigger_train_id: string;
  delay_minutes: number;
  detected_at: string;
  resolved_at: string | null;
  cascade_impact: CascadeImpact | null;
  resolution_options: ResolutionOption[] | null;
  resolution_applied: ResolutionOption | null;
  notifications: GeneratedNotifications | null;
  status: "active" | "analyzing" | "resolved";
  severity: "low" | "medium" | "high" | "critical";
}

export interface AgentLog {
  id: string;
  agent_name: "Sentinel" | "CascadeAnalyzer" | "Resolution" | "Communication" | "Orchestrator";
  action: string;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  duration_ms: number | null;
  incident_id: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  incident_id: string;
  recipient_type: "passenger" | "stationmaster" | "crew";
  channel: "sms" | "brief" | "alert";
  content: string;
  created_at: string;
}
