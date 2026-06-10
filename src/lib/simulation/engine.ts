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

export class SimulationEngine {
  private interval: ReturnType<typeof setInterval> | null = null;
  private trainStates: Map<string, TrainState> = new Map();
  private stationCoords: Map<string, StationCoord> = new Map();
  private initialized: boolean = false;

  private async initialize() {
    if (this.initialized) return;

    // 1. Load station coordinates
    let stationsData: any[] = []
    try {
      const fs = await import('fs')
      const path = await import('path')
      const filePath = path.join(process.cwd(), 'public/data/stations.json')
      if (fs.existsSync(filePath)) {
        stationsData = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      }
    } catch {
      // In production/edge, stations loaded elsewhere
      stationsData = []
    }

    try {
      for (const station of stationsData) {
        this.stationCoords.set(station.code, {
          code: station.code,
          lat: station.lat,
          lng: station.lng,
        });
      }
    } catch (err) {
      console.error("Failed to parse station coordinates in simulation engine:", err);
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
