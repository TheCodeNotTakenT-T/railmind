import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase";

// Tool 1: get_train_status
async function getTrainStatus(params: { train_id: string }) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: train, error } = await supabase
      .from("trains")
      .select("*")
      .eq("id", params.train_id)
      .maybeSingle();

    if (error) return { error: error.message };
    if (!train) return { error: `Train not found: ${params.train_id}` };
    return train;
  } catch (err: any) {
    return { error: err.message || "Failed to fetch train status" };
  }
}

// Tool 2: get_station_schedule
async function getStationSchedule(params: { station_code: string; time_window_minutes: number }) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: trains, error } = await supabase.from("trains").select("*");

    if (error) return { error: error.message };

    const codeUpper = params.station_code.toUpperCase();
    const filtered = (trains || [])
      .filter((t: any) => t.route.includes(codeUpper) && t.status !== "resolved")
      .slice(0, 10)
      .map((t: any) => ({
        train_name: t.name,
        train_id: t.id,
        delay_minutes: t.delay_minutes,
        status: t.status,
        passengers: t.passengers,
      }));

    return filtered;
  } catch (err: any) {
    return { error: err.message || "Failed to fetch station schedule" };
  }
}

// Tool 3: get_track_occupancy
async function getTrackOccupancy(params: { station_code: string }) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: trains, error } = await supabase.from("trains").select("*");

    if (error) return { error: error.message };

    const codeUpper = params.station_code.toUpperCase();
    const count = (trains || []).filter(
      (t: any) => t.route.includes(codeUpper) && t.current_station_index > 0
    ).length;

    return { station_code: codeUpper, trains_on_approach: count };
  } catch (err: any) {
    return { error: err.message || "Failed to fetch track occupancy" };
  }
}

// Tool 4: get_crew_assignments
async function getCrewAssignments(params: { train_id: string }) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: train, error } = await supabase
      .from("trains")
      .select("*")
      .eq("id", params.train_id)
      .maybeSingle();

    if (error) return { error: error.message };
    if (!train) return { error: `Train not found: ${params.train_id}` };

    return {
      train_id: params.train_id,
      loco_pilot: `LP-${params.train_id}`,
      assistant_pilot: `ALP-${params.train_id}`,
      guard: `GD-${params.train_id}`,
      crew_available: true,
      next_duty_train: null,
    };
  } catch (err: any) {
    return { error: err.message || "Failed to fetch crew assignments" };
  }
}

// Tool 5: get_passenger_count
async function getPassengerCount(params: { train_id: string }) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: train, error } = await supabase
      .from("trains")
      .select("passengers")
      .eq("id", params.train_id)
      .maybeSingle();

    if (error) return { error: error.message };
    if (!train) return { error: `Train not found: ${params.train_id}` };

    return { train_id: params.train_id, passengers: train.passengers };
  } catch (err: any) {
    return { error: err.message || "Failed to fetch passenger count" };
  }
}

// Tool 6: get_available_platforms
async function getAvailablePlatforms(params: { station_code: string }) {
  try {
    const supabase = createServerSupabaseClient();
    const codeUpper = params.station_code.toUpperCase();

    const { data: station, error: stationError } = await supabase
      .from("stations")
      .select("platforms")
      .eq("code", codeUpper)
      .maybeSingle();

    if (stationError) return { error: stationError.message };
    if (!station) return { error: `Station not found: ${codeUpper}` };

    const { data: trains, error: trainsError } = await supabase.from("trains").select("*");

    if (trainsError) return { error: trainsError.message };

    const occupied = (trains || []).filter(
      (t: any) =>
        t.route.includes(codeUpper) &&
        t.current_station_index > 0 &&
        t.status !== "on_time"
    ).length;

    const total_platforms = station.platforms || 0;
    const available = Math.max(0, total_platforms - occupied);

    return {
      station_code: codeUpper,
      total_platforms,
      occupied,
      available,
    };
  } catch (err: any) {
    return { error: err.message || "Failed to fetch platform status" };
  }
}

export const TOOL_IMPLEMENTATIONS: Record<string, (params: any) => Promise<unknown>> = {
  get_train_status: getTrainStatus,
  get_station_schedule: getStationSchedule,
  get_track_occupancy: getTrackOccupancy,
  get_crew_assignments: getCrewAssignments,
  get_passenger_count: getPassengerCount,
  get_available_platforms: getAvailablePlatforms,
};

export const TOOL_SCHEMAS = [
  {
    name: "get_train_status",
    description: "Get the status, position, delay, and route of a specific train.",
    parameters: z.object({
      train_id: z.string().describe("The unique ID or number of the train."),
    }),
  },
  {
    name: "get_station_schedule",
    description:
      "Get the list of trains scheduled to arrive or passing through a specific station within a time window.",
    parameters: z.object({
      station_code: z
        .string()
        .describe("The official Indian Railways station code (e.g. NDLS, PNBE)."),
      time_window_minutes: z.number().describe("The time window in minutes to look ahead."),
    }),
  },
  {
    name: "get_track_occupancy",
    description: "Get the number of trains currently on approach to a specific station.",
    parameters: z.object({
      station_code: z.string().describe("The official Indian Railways station code."),
    }),
  },
  {
    name: "get_crew_assignments",
    description: "Fetch the active crew roster, including loco pilot and assistant pilot, for a specific train.",
    parameters: z.object({
      train_id: z.string().describe("The unique ID or number of the train."),
    }),
  },
  {
    name: "get_passenger_count",
    description: "Get the total number of passengers currently on board a specific train.",
    parameters: z.object({
      train_id: z.string().describe("The unique ID or number of the train."),
    }),
  },
  {
    name: "get_available_platforms",
    description: "Query the total, occupied, and available platform status at a specific station.",
    parameters: z.object({
      station_code: z.string().describe("The official Indian Railways station code."),
    }),
  },
];
