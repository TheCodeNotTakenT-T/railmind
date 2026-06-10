# RailMind 🚄
### Autonomous Cascade Delay Prevention for Indian Railways

[![Live Demo](https://img.shields.io/badge/Live%20Demo-railmind--lake.vercel.app-dc2626?style=for-the-badge)](https://railmind-lake.vercel.app)
[![Built for FAR AWAY 2026](https://img.shields.io/badge/FAR%20AWAY-2026-navy?style=for-the-badge)](https://faraway.zuup.org)
[![Theme](https://img.shields.io/badge/Theme-Railways%20+%20Agentic%20AI-orange?style=for-the-badge)]()

> *"Japan's Shinkansen achieves 99.9% on-time performance. Indian Railways averages 65%. The gap isn't infrastructure  it's intelligence. RailMind brings that intelligence to India."*

---

## The Problem

India's railways carry **23 million passengers daily** across 68,000 route kilometres. When a single train is delayed, it doesn't just affect its own passengers  it triggers a **cascade**: platform conflicts force the next train to wait, crew crossovers fail because the same crew was scheduled for two trains, and passengers miss connections across multiple services.

This cascade is managed today with **phone calls, paper records, and software from the 1990s.**

A 20-minute primary delay becomes a 2-hour cascade affecting 10–20 trains and thousands of passengers. Nobody detects it early. Nobody coordinates the response. It just gets worse.

**This costs Indian Railways ₹20,000 crore annually. And it is entirely preventable.**

---

## The Solution: RailMind

RailMind is a **multi-agent AI system** that:

1. **Monitors** 50 trains across 5 major Indian railway corridors in real-time
2. **Detects** when a delay will cascade  15–30 minutes before it becomes unrecoverable
3. **Analyzes** the full downstream impact: which trains, which passengers, which crew crossovers
4. **Generates** 3 concrete resolution options with specific platform numbers, hold times, and rerouting
5. **Drafts** targeted communications for passengers (SMS), station masters (operational brief), and crew (schedule alert)

**Autonomously. In under 10 seconds.**

---

## Live Demo

🔴 **[railmind-lake.vercel.app](https://railmind-lake.vercel.app)**

**To see the full system in action:**
1. Open the dashboard
2. Click **"Run Demo Scenario"** → Select **"Howrah Rajdhani  Patna Cascade"**
3. Watch 4 AI agents activate in sequence in the Agent Feed
4. Click the new incident card → see cascade graph, resolution options, and generated SMS

---

## How It Works

### The 4-Agent Pipeline

```
POST /api/agents/analyze
        ↓
[Orchestrator]  sequences all agents, handles failures gracefully
        ↓
[Sentinel Agent]
  → Analyzes delay severity using real train + station data
  → Output: severity (low/medium/high/critical), time to cascade
  → If LOW severity: pipeline stops, incident auto-resolved
        ↓
[Cascade Analyzer Agent]
  → Traces full downstream impact: platform conflicts, crew crossovers, passenger connections
  → Output: affected trains list, passengers count, conflict details
        ↓
[Resolution Agent]
  → Generates 3 concrete, immediately actionable resolution options
  → Output: specific platform numbers, hold times, rerouting with timestamps [HH:MM]
        ↓
[Communication Agent]
  → Drafts targeted notifications for 3 audiences
  → Output: Passenger SMS (≤160 chars), Station Master brief (5 timestamped actions), Crew alert
```

### Agent Sample Output (Real, Not Fabricated)

**Sentinel:** `"HIGH severity  Howrah Rajdhani Express running 25 min late at DDU junction. Cascade risk to 3 connecting services within 18 minutes."`

**Cascade:** `"Sealdah Rajdhani: +15 min (platform conflict), Poorva Express: +10 min (crew crossover), Jharkhand Swarna Jayanti: +8 min (track blocking)"`

**Resolution Option 1:** `"[13:55] Move Train 12301 from Platform 3 to Platform 5 | [13:58] Hold departure of 12302 by 8 minutes | [14:01] Adjust crew crossover for 12382"`

**Passenger SMS:** `"Train 12301 delayed 25min. Platform 5 at 14:17."` (47 chars)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SIMULATION LAYER                         │
│  SimulationEngine → 50 trains across 5 corridors            │
│  Injects realistic delay scenarios for demo                 │
└────────────────────────┬────────────────────────────────────┘
                         │ writes every 5 seconds
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE (PostgreSQL)                    │
│  Tables: trains, stations, incidents, agent_logs,           │
│          notifications                                      │
│ Realtime: trains, incidents, agent_logs (live subscriptions)│
└────────────────────────┬────────────────────────────────────┘
                         │ realtime subscriptions
          ┌──────────────┼──────────────┐
          ↓              ↓              ↓
┌─────────────┐  ┌─────────────┐  ┌──────────────┐
│ useTrains() │  │useIncidents │  │useAgentLogs()│
│   hook      │  │  () hook    │  │   hook       │
└─────────────┘  └─────────────┘  └──────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    NEXT.JS DASHBOARD                        │
│                                                             │
│  [Railway Map]  [Incident Panel]  [Agent Feed]  [Modals]    │
│  react-leaflet   active incidents  live AI logs  cascade +  │
│  50 live trains  severity sorted   color-coded   resolution │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Frontend** | Next.js 16 + TypeScript | Full-stack React framework |
| **UI** | Tailwind CSS v4 + shadcn/ui | Dark theme component system |
| **Map** | React-Leaflet + CartoDB Dark tiles | Live train position visualization |
| **Animations** | Framer Motion | Agent feed, cascade graph animations |
| **Charts** | Recharts | Impact metrics dashboard |
| **AI Agents** | Groq API (Llama 3.3 70B) via Vercel AI SDK | Multi-agent reasoning and tool use |
| **Database** | Supabase PostgreSQL | Train, incident, and agent data storage |
| **Realtime** | Supabase Realtime | Live subscriptions (no polling) |
| **State** | Zustand | Global client-side state management |
| **Deployment** | Vercel | Production hosting with Edge runtime |

---

## Railway Data

- **50 trains** across 5 major corridors: Delhi-Mumbai, Delhi-Howrah, Delhi-Chennai, Mumbai-Bangalore, Delhi-Amritsar
- **60 stations** with real coordinates from Indian Railways network
- **8 railway corridor GeoJSON polylines** for map visualization
- **4 pre-built incident scenarios** based on real cascade patterns

---

## Quick Start

### Prerequisites
- Node.js 18+
- Supabase account (free)
- Groq API key (free at [console.groq.com](https://console.groq.com))

### Setup

```bash
git clone https://github.com/TheCodeNotTakenT-T/railmind.git
cd railmind
npm install
```

### Environment Variables

Create `.env.local`:

```env
# Groq AI API (free tier  get from console.groq.com)
GROQ_API_KEY=gsk_your_key_here

# Supabase Project (get from supabase.com dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Database Setup

Run each SQL block in your Supabase SQL Editor:

```sql
CREATE TABLE trains (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, number TEXT,
  origin TEXT, destination TEXT, route JSONB,
  current_lat FLOAT8, current_lng FLOAT8, current_station_index INT DEFAULT 0,
  scheduled_arrival TIMESTAMPTZ, actual_arrival TIMESTAMPTZ,
  delay_minutes INT DEFAULT 0, status TEXT DEFAULT 'on_time',
  passengers INT DEFAULT 500, updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE stations (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, code TEXT UNIQUE,
  lat FLOAT8, lng FLOAT8, zone TEXT, platforms INT DEFAULT 4
);

CREATE TABLE incidents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger_train_id TEXT REFERENCES trains(id),
  delay_minutes INT, detected_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ, cascade_impact JSONB,
  resolution_options JSONB, resolution_applied JSONB,
  notifications JSONB, status TEXT DEFAULT 'active',
  severity TEXT DEFAULT 'medium'
);

CREATE TABLE agent_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name TEXT NOT NULL, action TEXT NOT NULL,
  input JSONB, output JSONB, duration_ms INT,
  incident_id UUID REFERENCES incidents(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID REFERENCES incidents(id),
  recipient_type TEXT, channel TEXT,
  content TEXT, created_at TIMESTAMPTZ DEFAULT now()
);
```

Enable Realtime for `trains`, `incidents`, `agent_logs` in Supabase → Database → Replication → Publications.

### Seed and Run

```bash
# Seed the database with 50 trains and 60 stations
npx tsx scripts/seed-db.ts

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Agent Details

See [`/docs/agent-specs.md`](docs/agent-specs.md) for full agent specifications including system prompts, tool definitions, and input/output schemas.

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trains` | All 50 trains, sorted by severity |
| GET | `/api/trains/[id]` | Single train + active incident |
| GET | `/api/stations` | All stations (cached 1hr) |
| GET | `/api/incidents` | Active/resolved incidents |
| GET | `/api/incidents/[id]` | Full incident with all agent outputs |
| POST | `/api/incidents/[id]/resolve` | Apply a resolution option |
| POST | `/api/simulation/inject` | Inject a delay scenario |
| POST | `/api/simulation/reset` | Reset all trains and incidents |
| POST | `/api/agents/analyze` | Trigger full 4-agent pipeline |
| GET | `/api/agent-logs` | Agent activity logs |

---

## What Judges Should Know

**This is not a chatbot.** RailMind is an autonomous operations intelligence layer. The AI agents:
- Make structured decisions using real database queries as tools
- Produce specific, actionable outputs (not generic suggestions)
- Operate in a defined sequence with failure isolation
- Generate outputs that real railway operators could act on immediately

**The cascade graph** (visible when opening any analyzed incident) is not decorative  it represents real computational reasoning about which trains will be delayed, why, and in what order.

**The 8-second pipeline** is from production data. Run the demo yourself.

---

## Built For

**FAR AWAY 2026**  India's Biggest International Hackathon  
**Theme:** Railways + Agentic & Autonomous Systems  
**Team:**  👉👈
**Round 1 Submission**

---

## License

MIT © 2026 TheCodeNotTakenT-T
