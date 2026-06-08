export interface DemoScenario {
  id: "A" | "B" | "C" | "D";
  name: string;
  description: string;
  trainId: string;
  delayMinutes: number;
  reason: string;
  affectedStation: string; // station code
  expectedCascadeTrains: number;
  expectedPassengersAffected: number;
  timeToImpact: number; // minutes until cascade unrecoverable
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "A",
    name: "Howrah Rajdhani — Patna Junction Cascade",
    description: "Howrah Rajdhani (12301) running 25 minutes late approaching Patna Junction. Will conflict with 3 trains sharing the same platform assignment.",
    trainId: "12301",
    delayMinutes: 25,
    reason: "Signal failure at Mughal Sarai section",
    affectedStation: "PNBE",
    expectedCascadeTrains: 3,
    expectedPassengersAffected: 1247,
    timeToImpact: 18
  },
  {
    id: "B",
    name: "Signal Failure — Mumbai-Nashik Section",
    description: "Complete signal failure at Igatpuri. 5 trains blocked on the Mumbai-Nashik ghat section. Mountain terrain prevents rerouting.",
    trainId: "19019",
    delayMinutes: 40,
    reason: "OHE (overhead equipment) failure at Igatpuri",
    affectedStation: "IGP",
    expectedCascadeTrains: 5,
    expectedPassengersAffected: 3200,
    timeToImpact: 12
  },
  {
    id: "C",
    name: "Crew Unavailable — Mathura Junction",
    description: "Loco pilot for Delhi-Agra section called in sick. Crew handoff cannot happen at Mathura Jn, affecting 2 connecting services.",
    trainId: "12951",
    delayMinutes: 20,
    reason: "Crew unavailability — loco pilot absence",
    affectedStation: "MTJ",
    expectedCascadeTrains: 2,
    expectedPassengersAffected: 890,
    timeToImpact: 22
  },
  {
    id: "D",
    name: "Platform Conflict — New Delhi Station",
    description: "Four major trains arriving simultaneously at New Delhi. Only 2 platforms available. Station master must reassign platforms within 15 minutes.",
    trainId: "12305",
    delayMinutes: 15,
    reason: "Simultaneous arrival — platform shortage",
    affectedStation: "NDLS",
    expectedCascadeTrains: 4,
    expectedPassengersAffected: 2100,
    timeToImpact: 15
  }
];
