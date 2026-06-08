# RailMind — System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     DATA INGESTION LAYER                         │
│                                                                  │
│   [NTES Live API] ──→ [Simulation Engine] ──→ [Supabase DB]     │
│   (fallback)              (primary)          (PostgreSQL)        │
└──────────────────────────────┬──────────────────────────────────┘
                               │ Realtime subscriptions
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                      AGENT LAYER                                 │
│                                                                  │
│   POST /api/agents/analyze                                       │
│              ↓                                                   │
│   [Orchestrator Agent]                                           │
│         ↓          ↓          ↓           ↓                     │
│   [Sentinel]  [Cascade]  [Resolution]  [Communication]          │
│    Agent      Analyzer    Agent          Agent                   │
│                                                                  │
│   Each agent: calls Gemini API with tools → writes to Supabase  │
└──────────────────────────────┬──────────────────────────────────┘
                               │ Supabase Realtime
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                     DASHBOARD LAYER                              │
│                                                                  │
│   [Railway Map]  [Incident Panel]  [Agent Feed]  [Notifications]│
│   react-leaflet   useIncidents()   useAgentLogs()  Preview UI   │
│                                                                  │
│   All components subscribe to Supabase Realtime — no polling    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Agent Responsibility Matrix

| Agent | Role | Trigger | Avg Duration | Output Stored In |
|-------|------|---------|-------------|-----------------|
| **Orchestrator** | Sequences all agents, manages state | POST /api/agents/analyze | — | incidents.status |
| **Sentinel** | Detects delay severity, decides if cascade analysis needed | On every incident creation | ~5s | incidents.sentinel_analysis |
| **Cascade Analyzer** | Traces full downstream impact across trains, crew, passengers | After Sentinel flags HIGH/CRITICAL | ~15s | incidents.cascade_impact |
| **Resolution** | Generates 2–3 concrete resolution options with tradeoffs | After Cascade analysis complete | ~15s | incidents.resolution_options |
| **Communication** | Drafts SMS, Station Master brief, Crew alert | After Resolution options ready | ~10s | notifications table |

---

## Data Flow

```
1. SIMULATION TICK (every 5 seconds)
   SimulationEngine.tick()
   → Updates all 50 trains' positions, delays, status
   → Writes to Supabase `trains` table

2. DELAY INJECTION (manual or via demo launcher)
   POST /api/simulation/inject { trainId, delayMinutes, reason }
   → Updates train.delay_minutes and train.status in Supabase
   → Creates new row in `incidents` table (status: 'active')
   → Returns incidentId

3. AGENT PIPELINE TRIGGER
   POST /api/agents/analyze { incidentId }
   → Orchestrator.handleIncident(incidentId)
   → Runs agents in sequence, each reads previous output from Supabase
   → Each agent writes its output to Supabase and logs to agent_logs
   → Incident status updates: active → analyzing → resolved

4. REALTIME PROPAGATION
   Supabase Realtime fires on changes to: trains, incidents, agent_logs
   → useTrains() hook receives new train positions
   → useIncidents() hook receives new/updated incidents
   → useAgentLogs() hook receives new agent log entries
   → React components re-render automatically

5. RESOLUTION APPLICATION
   POST /api/incidents/[id]/resolve { resolutionIndex: 0|1|2 }
   → Marks incident as resolved
   → Stores which resolution was applied
   → Updates affected trains' status back toward on_time
   → Metrics counters increment
```

---

## Database Schema

```
trains
  id (TEXT PK), name, number, origin, destination
  route (JSONB - array of station codes)
  current_lat, current_lng, current_station_index
  scheduled_arrival, actual_arrival, delay_minutes
  status: on_time | delayed | critical
  passengers, updated_at

stations
  id (TEXT PK), name, code (UNIQUE), lat, lng, zone, platforms

incidents
  id (UUID PK), trigger_train_id (FK → trains)
  delay_minutes, detected_at, resolved_at
  cascade_impact (JSONB), resolution_options (JSONB)
  resolution_applied (JSONB), notifications (JSONB)
  status: active | analyzing | resolved
  severity: low | medium | high | critical

agent_logs
  id (UUID PK), agent_name, action
  input (JSONB), output (JSONB), duration_ms
  incident_id (FK → incidents), created_at

notifications
  id (UUID PK), incident_id (FK → incidents)
  recipient_type: passenger | stationmaster | crew
  channel: sms | brief | alert
  content (TEXT), created_at
```

---

## API Routes Plan

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| GET | `/api/trains` | All 50 current train positions | Public |
| GET | `/api/trains/[id]` | Single train + active incident | Public |
| GET | `/api/stations` | All stations with coordinates | Public (cached) |
| GET | `/api/incidents` | Active incidents, sorted by severity | Public |
| GET | `/api/incidents/[id]` | Full incident with all agent outputs | Public |
| POST | `/api/incidents/[id]/resolve` | Apply a resolution option | Server |
| POST | `/api/simulation/inject` | Inject a delay scenario | Server |
| POST | `/api/simulation/reset` | Reset all trains + incidents | Server |
| POST | `/api/agents/analyze` | Trigger full agent pipeline | Server |
| GET | `/api/agent-logs` | Last 50 agent log entries | Public |

---

## Key Design Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| AI Provider | Google Gemini 2.5 Flash | Free tier, supports tool use, 1500 req/day |
| Database | Supabase PostgreSQL | Realtime built-in, free tier, instant setup |
| Simulation vs Live API | Simulation primary | Demo never breaks regardless of NTES uptime |
| Agent communication | Sequential via Supabase | Simple, debuggable, each agent reads DB not memory |
| Frontend state | Supabase Realtime hooks | No polling, instant updates, no extra state server |
| Map tiles | CartoDB Dark | Free, dark theme, no API key needed |

---

## Folder Structure

```
railmind/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── trains/
│   │   │   ├── stations/
│   │   │   ├── incidents/
│   │   │   ├── simulation/
│   │   │   ├── agents/
│   │   │   └── agent-logs/
│   │   ├── dashboard/
│   │   ├── incidents/
│   │   ├── agents/
│   │   ├── notifications/
│   │   ├── metrics/
│   │   └── layout.tsx
│   ├── components/
│   │   ├── map/
│   │   ├── incidents/
│   │   ├── agents/
│   │   ├── notifications/
│   │   ├── metrics/
│   │   └── ui/ (shadcn)
│   ├── hooks/
│   ├── lib/
│   │   ├── agents/
│   │   │   └── tools/
│   │   ├── simulation/
│   │   ├── data/
│   │   ├── supabase.ts
│   │   ├── types.ts
│   │   └── utils.ts
│   ├── store/
│   └── env.d.ts
├── public/
│   └── data/
│       ├── rail-network.geojson
│       └── stations.csv
├── docs/
│   ├── architecture.md  ← this file
│   ├── agent-specs.md
│   └── API.md
└── scripts/
    ├── seed-db.ts
    └── test-engine.ts
```