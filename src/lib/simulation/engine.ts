import { createServerSupabaseClient } from "@/lib/supabase";
import { SEED_TRAINS } from "@/lib/data/seed-trains";
import type { Train } from "@/lib/types";

interface StationCoord {
  code: string;
  lat: number;
  lng: number;
}

interface TrainState {
  id: string;
  name: string;
  number: string;
  origin: string;
  destination: string;
  route: string[];
  current_station_index: number;
  progress: number; // 0.0 to 1.0 — how far between current and next station
  current_lat: number;
  current_lng: number;
  delay_minutes: number;
  status: "on_time" | "delayed" | "critical";
  passengers: number;
  scheduled_arrival: string;
  updated_at: string;
}

const STATION_COORDS: Record<string, { lat: number, lng: number }> = {
  'NDLS': { lat: 28.6429, lng: 77.2195 },
  'NZM': { lat: 28.5874, lng: 77.2509 },
  'MTJ': { lat: 27.4924, lng: 77.6737 },
  'AGC': { lat: 27.1592, lng: 77.9800 },
  'GWL': { lat: 26.2183, lng: 78.1828 },
  'JHS': { lat: 25.4484, lng: 78.5685 },
  'BPL': { lat: 23.2599, lng: 77.4126 },
  'ET': { lat: 22.6152, lng: 77.7647 },
  'KOTA': { lat: 25.1799, lng: 75.8304 },
  'RTM': { lat: 23.3341, lng: 75.0376 },
  'BRC': { lat: 22.3144, lng: 73.1843 },
  'ST': { lat: 21.2066, lng: 72.8311 },
  'BCT': { lat: 18.9690, lng: 72.8193 },
  'CSTM': { lat: 18.9400, lng: 72.8353 },
  'LTT': { lat: 19.0760, lng: 72.9090 },
  'KYN': { lat: 19.2437, lng: 73.1355 },
  'IGP': { lat: 19.7000, lng: 73.5667 },
  'PUNE': { lat: 18.5286, lng: 73.8741 },
  'SUR': { lat: 17.6805, lng: 75.9064 },
  'NGP': { lat: 21.1461, lng: 79.0810 },
  'CNB': { lat: 26.4543, lng: 80.3484 },
  'LKO': { lat: 26.8467, lng: 80.9462 },
  'ALD': { lat: 25.4358, lng: 81.8463 },
  'BSB': { lat: 25.3176, lng: 82.9739 },
  'DDU': { lat: 25.2786, lng: 83.1100 },
  'PNBE': { lat: 25.5942, lng: 85.1376 },
  'DHN': { lat: 23.7957, lng: 86.4304 },
  'HWH': { lat: 22.5831, lng: 88.3420 },
  'MAS': { lat: 13.0827, lng: 80.2707 },
  'SBC': { lat: 12.9767, lng: 77.5713 },
  'SC': { lat: 17.4355, lng: 78.5036 },
  'GTL': { lat: 15.1670, lng: 77.3630 },
  'ADI': { lat: 23.0258, lng: 72.6032 },
  'JP': { lat: 26.9158, lng: 75.7876 },
  'ASR': { lat: 31.6340, lng: 74.8723 },
  'LDH': { lat: 30.8743, lng: 75.8573 },
  'UMB': { lat: 30.3753, lng: 76.7821 },
  'CDG': { lat: 30.7333, lng: 76.7794 },
  'UDZ': { lat: 24.5854, lng: 73.7125 },
  'JU': { lat: 26.2389, lng: 73.0243 },
  'BBS': { lat: 20.2961, lng: 85.8189 },
  'VSKP': { lat: 17.6868, lng: 83.2185 },
  'BZA': { lat: 16.5167, lng: 80.6167 },
  'GKP': { lat: 26.7606, lng: 83.3732 },
  'GHY': { lat: 26.1842, lng: 91.7452 },
  'TVC': { lat: 8.4883, lng: 76.9523 },
  'ERS': { lat: 9.9816, lng: 76.2999 },
  'CBE': { lat: 11.0168, lng: 76.9558 },
  'MDU': { lat: 9.9193, lng: 78.1193 }
};

export class SimulationEngine {
  private interval: ReturnType<typeof setInterval> | null = null;
  private trainStates: Map<string, TrainState> = new Map();
  private stationCoords: Map<string, StationCoord> = new Map();
  private initialized: boolean = false;

  private async initialize() {
    if (this.initialized) return;

    // Load station coordinates from hardcoded map (works in all environments)
    for (const [code, coords] of Object.entries(STATION_COORDS)) {
      this.stationCoords.set(code, { code, ...coords })
    }

    // 2. Load all trains from Supabase
    try {
      const supabase = createServerSupabaseClient();
      const { data: trains, error } = await supabase.from("trains").select("*");
      if (error) {
        throw error;
      }

      if (trains) {
        for (const t of trains as Train[]) {
          const startStationCode = t.route[t.current_station_index];
          const station = this.stationCoords.get(startStationCode);
          const initialLat = station ? station.lat : t.current_lat || 20.5937;
          const initialLng = station ? station.lng : t.current_lng || 78.9629;

          this.trainStates.set(t.id, {
            id: t.id,
            name: t.name,
            number: t.number,
            origin: t.origin,
            destination: t.destination,
            route: t.route,
            current_station_index: t.current_station_index,
            progress: 0.0,
            current_lat: initialLat,
            current_lng: initialLng,
            delay_minutes: t.delay_minutes,
            status: t.status,
            passengers: t.passengers,
            scheduled_arrival: t.scheduled_arrival,
            updated_at: t.updated_at,
          });
        }
      }

      this.initialized = true;
    } catch (err) {
      console.error("Failed to load trains from Supabase in simulation engine:", err);
    }
  }

  private interpolatePosition(trainState: TrainState): { lat: number; lng: number } {
    const route = trainState.route;
    const currentStationCode = route[trainState.current_station_index];
    const currentStation = this.stationCoords.get(currentStationCode);

    let nextIndex = trainState.current_station_index + 1;
    if (nextIndex >= route.length) {
      nextIndex = trainState.current_station_index;
    }
    const nextStationCode = route[nextIndex];
    const nextStation = this.stationCoords.get(nextStationCode);

    if (!currentStation || !nextStation) {
      return { lat: 20.5937, lng: 78.9629 };
    }

    const lat = currentStation.lat + (nextStation.lat - currentStation.lat) * trainState.progress;
    const lng = currentStation.lng + (nextStation.lng - currentStation.lng) * trainState.progress;

    return { lat, lng };
  }

  private determineStatus(delayMinutes: number): "on_time" | "delayed" | "critical" {
    if (delayMinutes < 5) return "on_time";
    if (delayMinutes <= 30) return "delayed";
    return "critical";
  }

  private determineSeverity(delayMinutes: number): "low" | "medium" | "high" | "critical" {
    if (delayMinutes < 10) return "low";
    if (delayMinutes <= 20) return "medium";
    if (delayMinutes <= 35) return "high";
    return "critical";
  }

  public async start() {
    if (!this.initialized) {
      await this.initialize();
    }
    if (this.interval) return;

    this.interval = setInterval(() => {
      this.tick().catch((err) => console.error("Error inside simulation tick:", err));
    }, 5000);

    console.log("🚂 Simulation engine started");
  }

  public stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    console.log("🛑 Simulation engine stopped");
  }

  public async tick() {
    if (!this.initialized) return;

    for (const trainState of this.trainStates.values()) {
      trainState.progress += 0.015;
      if (trainState.progress >= 1.0) {
        trainState.progress = 0.0;
        trainState.current_station_index += 1;
        if (trainState.current_station_index >= trainState.route.length - 1) {
          trainState.current_station_index = 0;
        }
      }

      const pos = this.interpolatePosition(trainState);
      trainState.current_lat = pos.lat;
      trainState.current_lng = pos.lng;
      trainState.updated_at = new Date().toISOString();
    }

    const updates = Array.from(this.trainStates.values()).map((t) => ({
      id: t.id,
      current_lat: t.current_lat,
      current_lng: t.current_lng,
      current_station_index: t.current_station_index,
      delay_minutes: t.delay_minutes,
      status: t.status,
      updated_at: t.updated_at,
    }));

    try {
      const supabase = createServerSupabaseClient();
      const { error } = await supabase.from("trains").upsert(updates, { onConflict: "id" });
      if (error) {
        console.error("Supabase upsert error in tick:", error.message);
      }
    } catch (err) {
      console.error("Catch error in tick upsert:", err);
    }
  }

  public async injectDelay(trainId: string, delayMinutes: number, reason: string): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }

    const trainState = this.trainStates.get(trainId);
    if (!trainState) {
      throw new Error("Train not found: " + trainId);
    }

    trainState.delay_minutes = delayMinutes;
    trainState.status = this.determineStatus(delayMinutes);
    trainState.updated_at = new Date().toISOString();

    const supabase = createServerSupabaseClient();
    const { error: updateError } = await supabase
      .from("trains")
      .update({
        delay_minutes: trainState.delay_minutes,
        status: trainState.status,
        updated_at: trainState.updated_at,
      })
      .eq("id", trainId);

    if (updateError) {
      throw new Error("Failed to update train in Supabase: " + updateError.message);
    }

    const { data: incident, error: incidentError } = await supabase
      .from("incidents")
      .insert({
        trigger_train_id: trainId,
        delay_minutes: delayMinutes,
        detected_at: new Date().toISOString(),
        status: "active",
        severity: this.determineSeverity(delayMinutes),
        cascade_impact: null,
        resolution_options: null,
        resolution_applied: null,
        notifications: null,
      })
      .select("id")
      .single();

    if (incidentError) {
      throw new Error("Failed to create incident in Supabase: " + incidentError.message);
    }

    const incidentId = incident.id;
    console.log("🚨 Delay injected:", trainId, delayMinutes, "min — Incident:", incidentId);
    return incidentId;
  }

  public async reset(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    for (const seed of SEED_TRAINS) {
      const trainState = this.trainStates.get(seed.id);
      if (trainState) {
        trainState.delay_minutes = 0;
        trainState.status = "on_time";
        trainState.progress = 0.0;
        trainState.current_station_index = seed.current_station_index;

        const startStationCode = seed.route[seed.current_station_index];
        const station = this.stationCoords.get(startStationCode);
        trainState.current_lat = station ? station.lat : 20.5937;
        trainState.current_lng = station ? station.lng : 78.9629;
        trainState.updated_at = new Date().toISOString();
      }
    }

    const updates = Array.from(this.trainStates.values()).map((t) => ({
      id: t.id,
      current_lat: t.current_lat,
      current_lng: t.current_lng,
      current_station_index: t.current_station_index,
      delay_minutes: t.delay_minutes,
      status: t.status,
      updated_at: t.updated_at,
    }));

    const supabase = createServerSupabaseClient();
    const { error: trainsError } = await supabase.from("trains").upsert(updates, { onConflict: "id" });
    if (trainsError) {
      throw new Error("Failed to reset trains in Supabase: " + trainsError.message);
    }

    const { error: incidentsError } = await supabase
      .from("incidents")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("status", "active");

    if (incidentsError) {
      // It is possible that no active incidents exist, which doesn't throw an error in Supabase update,
      // but if the query fails entirely we catch it.
      console.warn("Notice: resolving incidents query updated 0 or failed:", incidentsError.message);
    }

    console.log("🔄 Simulation reset complete");
  }

  public getSnapshot(): TrainState[] {
    return Array.from(this.trainStates.values());
  }
}

export const simulationEngine = new SimulationEngine();
