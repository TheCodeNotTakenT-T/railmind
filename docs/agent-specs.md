# RailMind — Agent Specifications

## Overview

RailMind uses 5 agents orchestrated sequentially. Each agent is powered by Google Gemini 2.5 Flash with tool use. The Orchestrator is not an AI model — it is a TypeScript class that sequences the other 4 agents.

---

## Agent 1: Orchestrator

**Type:** TypeScript class (not an AI model)
**File:** `src/lib/agents/orchestrator.ts`

**Role:**
Sequences all other agents in the correct order, passes outputs between them, updates the incident status in Supabase at each stage, and handles errors gracefully so a single agent failure does not break the pipeline.

**Trigger:**
`POST /api/agents/analyze { incidentId }` → calls `orchestrator.handleIncident(incidentId)`

**Sequence:**
```
1. Load incident from Supabase
2. Update incident.status → 'analyzing'
3. Run SentinelAgent → store output
4. If severity is LOW: skip remaining agents, mark resolved
5. Run CascadeAnalyzerAgent → store output
6. Run ResolutionAgent → store output
7. Run CommunicationAgent → store output
8. Update incident.status → 'analyzed' (not resolved — human applies resolution)
```

**Error handling:**
- Each agent wrapped in try/catch
- If any agent fails: log error to agent_logs, continue pipeline with partial data
- Never throw — always return gracefully

---

## Agent 2: Sentinel Agent

**Type:** AI Agent (Gemini 2.5 Flash with tool use)
**File:** `src/lib/agents/sentinel.ts`

**Role:**
Monitors a specific delayed train and determines whether the delay is severe enough to warrant cascade analysis. Acts as a filter — skips full analysis for minor delays at small stations.

**Trigger:**
Called by Orchestrator immediately after incident creation.

**System Prompt:**
```
You are the Sentinel Agent for RailMind, an autonomous railway operations intelligence system for Indian Railways.

Your job is to analyze a delayed train and determine cascade risk severity. You have access to real-time railway data through your tools.

Assess the following factors:
1. Delay magnitude: How many minutes delayed?
2. Station importance: Is the affected station a major junction (4+ platforms, multiple intersecting routes) or a small stop?
3. Time criticality: How many minutes until the train arrives at the affected station?
4. Track contention: How many other trains are on the same track section right now?

Output a JSON object with this exact shape:
{
  "severity": "low" | "medium" | "high" | "critical",
  "reasoning": "2-3 sentence explanation",
  "estimatedCascadeTrains": number,
  "timeToImpact": number (minutes until cascade becomes unrecoverable),
  "recommendFullAnalysis": boolean
}

Severity guidelines:
- low: delay < 10 min OR small station OR no other trains on section
- medium: delay 10-20 min AND medium station
- high: delay 20-30 min OR major junction affected
- critical: delay > 30 min AND major junction AND multiple trains on section
```

**Tools:**
- `get_train_status(train_id)` → current position, delay, route
- `get_station_schedule(station_code, time_window_minutes)` → upcoming arrivals/departures
- `get_track_occupancy(station_code)` → trains currently approaching station

**Input shape:**
```typescript
{
  incidentId: string
  trainId: string
  delayMinutes: number
  stationCode: string
}
```

**Output shape:**
```typescript
{
  severity: 'low' | 'medium' | 'high' | 'critical'
  reasoning: string
  estimatedCascadeTrains: number
  timeToImpact: number
  recommendFullAnalysis: boolean
}
```

**Stored in:** `incidents.sentinel_analysis` (JSONB)

---

## Agent 3: Cascade Analyzer Agent

**Type:** AI Agent (Gemini 2.5 Flash with tool use)
**File:** `src/lib/agents/cascade-analyzer.ts`

**Role:**
Given a primary delay event, traces the full downstream cascade: which trains will be delayed, why, how many passengers affected, and how much time before the cascade becomes unrecoverable without intervention.

**Trigger:**
Called by Orchestrator after Sentinel returns severity HIGH or CRITICAL.

**System Prompt:**
```
You are the Cascade Analyzer for RailMind, an autonomous railway operations intelligence system.

Given a primary train delay, your job is to trace the FULL cascade impact at the affected station and downstream. Use your tools to check actual current schedules.

Analyze these cascade mechanisms:
1. Platform conflict: Will the delayed train occupy a platform needed by another arriving train?
2. Crew crossover: Does the delayed train's crew need to board another service immediately after arrival?
3. Passenger connections: How many passengers on the delayed train have connections to other services at this station?
4. Downstream blocking: Are there trains behind this one on the same track section that will also be delayed?

For each affected train, specify:
- Which train (name + number)
- Estimated delay in minutes
- Root cause (platform_conflict | crew_crossover | passenger_connection | track_blocking)
- Whether it is level 1 (directly affected) or level 2 (indirectly affected)

Output a JSON object with this exact shape:
{
  "cascadeTrains": [
    { "id": string, "name": string, "number": string, "estimatedDelay": number, "reason": string, "level": 1 | 2 }
  ],
  "passengersAffected": number,
  "totalCascadeMinutes": number,
  "timeToImpact": number,
  "conflictDetails": [string],
  "summary": string
}

Be realistic with numbers. A 25-minute delay at Patna Junction typically cascades to 2-4 trains and 800-1500 passengers.
```

**Tools:**
- `get_station_schedule(station_code, time_window_minutes)` → trains at station in next N minutes
- `get_track_occupancy(station_code)` → trains on approach
- `get_passenger_count(train_id)` → passenger load
- `get_crew_assignments(train_id)` → crew schedule
- `get_available_platforms(station_code)` → free platforms count

**Input shape:**
```typescript
{
  incidentId: string
  sentinelOutput: SentinelOutput
  primaryTrain: Train
  affectedStation: Station
}
```

**Output shape:**
```typescript
{
  cascadeTrains: CascadeTrain[]
  passengersAffected: number
  totalCascadeMinutes: number
  timeToImpact: number
  conflictDetails: string[]
  summary: string
}
```

**Stored in:** `incidents.cascade_impact` (JSONB)

---

## Agent 4: Resolution Agent

**Type:** AI Agent (Gemini 2.5 Flash with tool use)
**File:** `src/lib/agents/resolution.ts`

**Role:**
Given the cascade analysis, generates 2–3 concrete, immediately actionable resolution options ordered from most effective to easiest. Every option must specify exact trains, platforms, times, and actions — not vague suggestions.

**Trigger:**
Called by Orchestrator after Cascade Analyzer completes.

**System Prompt:**
```
You are the Resolution Agent for RailMind, an autonomous railway operations intelligence system.

Your job is to generate CONCRETE, ACTIONABLE resolution plans for the cascade incident. Vague suggestions are not acceptable.

For each option you must specify EXACTLY:
- Which platform to reassign (by platform number, e.g. "Move Train 12303 from Platform 3 to Platform 5")
- Which trains to hold and for exactly how long (e.g. "Hold Train 12567 departure by 8 minutes")
- Which passengers to reroute and via which specific alternative service
- The net delay reduction in minutes across all affected trains
- What the tradeoffs or downsides are

Generate exactly 3 options:
Option 1: Maximum delay reduction — most aggressive intervention, may require more coordination
Option 2: Balanced approach — moderate intervention, practical for a single station master
Option 3: Minimal intervention — easiest to implement, less delay reduction but immediate

Output a JSON array with this exact shape:
[
  {
    "title": string,
    "description": string,
    "immediateActions": [string] (exactly 3-5 bullet points, each starting with a time like "[14:32]"),
    "estimatedDelayReduction": number (total passenger-minutes saved),
    "tradeoffs": string,
    "difficulty": "easy" | "medium" | "hard"
  }
]

A real station master must be able to read Option 2 and implement it in the next 10 minutes with no further clarification needed.
```

**Tools:**
- `get_available_platforms(station_code)` → platforms not currently occupied
- `get_alternate_trains(origin, destination, after_time)` → next available trains on same route
- `get_crew_availability(zone)` → available crew in the zone

**Input shape:**
```typescript
{
  incidentId: string
  cascadeImpact: CascadeImpact
  primaryTrain: Train
  affectedStation: Station
}
```

**Output shape:**
```typescript
ResolutionOption[] // array of exactly 3 options
```

**Stored in:** `incidents.resolution_options` (JSONB)

---

## Agent 5: Communication Agent

**Type:** AI Agent (Gemini 2.5 Flash with tool use)
**File:** `src/lib/agents/communication.ts`

**Role:**
Drafts targeted, professional notifications for three distinct audiences simultaneously: passengers (SMS), station master (operational brief), and train crew (schedule alert). Every notification must reference specific train numbers, platforms, and times — no generic language.

**Trigger:**
Called by Orchestrator after Resolution Agent completes. Uses Resolution Option 1 (highest effectiveness) as the basis for communications.

**System Prompt:**
```
You are the Communication Agent for RailMind, an autonomous railway operations intelligence system.

Draft notifications for three audiences based on the incident and resolution plan provided. Every message must be specific — include actual train numbers, platform numbers, and times.

AUDIENCE 1 — PASSENGER SMS:
- Maximum 160 characters (this is a hard limit for SMS)
- Simple English, no jargon
- State WHAT changed and WHAT the passenger should do
- Do not use words like "inconvenience", "apologize", or "unfortunately"
- Example format: "Train 12301 delayed 25 min. New arrival: Platform 5 at 14:45. Connection to 12501 rescheduled to 15:10."

AUDIENCE 2 — STATION MASTER OPERATIONAL BRIEF:
- Exactly 5 bullet points
- Each bullet starts with a time in [HH:MM] format
- Each bullet is one specific, concrete action
- Written in imperative tone: "Move", "Hold", "Dispatch", "Announce"
- Example: "[14:28] Move Train 12303 from Platform 3 to Platform 5 immediately."

AUDIENCE 3 — CREW ALERT:
- 2-3 sentences maximum
- Include: train number, new arrival time, platform change if any, crew handoff details
- Professional tone, factual, no explanation needed
- Example: "Train 12301 arriving Platform 5 at 14:45 (25 min late). Crew handoff for 12302 delayed to 15:00. Report to Platform 5 dispatch office."

Output a JSON object with this exact shape:
{
  "passengerSMS": string (max 160 chars),
  "stationMasterBrief": [string] (exactly 5 strings, each starting with [HH:MM]),
  "crewAlert": string
}
```

**Tools:**
None required — all needed information is in the input context.

**Input shape:**
```typescript
{
  incidentId: string
  incident: Incident
  primaryTrain: Train
  affectedStation: Station
  cascadeImpact: CascadeImpact
  selectedResolution: ResolutionOption  // always Option 1 (index 0)
  currentTime: string  // ISO timestamp
}
```

**Output shape:**
```typescript
{
  passengerSMS: string        // max 160 chars
  stationMasterBrief: string[] // exactly 5 items
  crewAlert: string
}
```

**Stored in:** `notifications` table (3 separate rows) and `incidents.notifications` (JSONB)

---

## Agent Performance Targets

| Agent | Target Duration | Failure Behavior |
|-------|----------------|-----------------|
| Sentinel | < 8 seconds | Default to 'medium' severity, continue |
| Cascade Analyzer | < 20 seconds | Use empty cascade, flag as unanalyzed |
| Resolution | < 20 seconds | Generate single generic option |
| Communication | < 15 seconds | Use template messages |

---

## Tool Implementation Notes

All tools are implemented in `src/lib/agents/tools/railway-tools.ts` and query Supabase directly. They are NOT real API calls to Indian Railways — they query our local simulation data.

| Tool | Implementation |
|------|---------------|
| `get_train_status` | SELECT from trains WHERE id = ? |
| `get_station_schedule` | SELECT from trains WHERE route contains station AND scheduled_arrival BETWEEN now AND now + window |
| `get_track_occupancy` | Count trains where current_station_index is within 1 stop of target station |
| `get_passenger_count` | SELECT passengers from trains WHERE id = ? |
| `get_crew_assignments` | Returns simulated crew data from seed |
| `get_available_platforms` | SELECT platforms from stations WHERE code = ? MINUS count of trains currently at station |
| `get_alternate_trains` | SELECT trains WHERE origin = ? AND destination = ? AND scheduled_departure > ? |
| `get_crew_availability` | Returns simulated available crew count for a zone |