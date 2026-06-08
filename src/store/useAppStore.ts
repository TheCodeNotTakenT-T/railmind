import { create } from "zustand";
import { Train, Incident, AgentLog } from "@/lib/types";

interface AppStore {
  // State
  trains: Train[];
  incidents: Incident[];
  agentLogs: AgentLog[];
  simulationRunning: boolean;
  selectedTrainId: string | null;
  selectedIncidentId: string | null;

  // Actions
  setTrains: (trains: Train[]) => void;
  updateTrain: (id: string, updates: Partial<Train>) => void;
  addIncident: (incident: Incident) => void;
  updateIncident: (id: string, updates: Partial<Incident>) => void;
  addAgentLog: (log: AgentLog) => void;
  setSimulationRunning: (running: boolean) => void;
  setSelectedTrainId: (id: string | null) => void;
  setSelectedIncidentId: (id: string | null) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  // Initial state
  trains: [],
  incidents: [],
  agentLogs: [],
  simulationRunning: false,
  selectedTrainId: null,
  selectedIncidentId: null,

  // Actions
  setTrains: (trains) => set({ trains }),
  
  updateTrain: (id, updates) =>
    set((state) => ({
      trains: state.trains.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),
    
  addIncident: (incident) =>
    set((state) => ({
      incidents: [incident, ...state.incidents],
    })),
    
  updateIncident: (id, updates) =>
    set((state) => ({
      incidents: state.incidents.map((i) => (i.id === id ? { ...i, ...updates } : i)),
    })),
    
  addAgentLog: (log) =>
    set((state) => ({
      agentLogs: [log, ...state.agentLogs].slice(0, 50),
    })),
    
  setSimulationRunning: (running) => set({ simulationRunning: running }),
  
  setSelectedTrainId: (id) => set({ selectedTrainId: id }),
  
  setSelectedIncidentId: (id) => set({ selectedIncidentId: id }),
}));
