import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { SEED_TRAINS } from "../src/lib/data/seed-trains";
import { Station } from "../src/lib/types";

// Load environment variables from .env.local
config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("❌ Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local");
  process.exit(1);
}

// Create Supabase client using Service Role key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function seedDatabase() {
  try {
    console.log("Reading stations.json...");
    const stationsFilePath = path.join(process.cwd(), "public/data/stations.json");
    if (!fs.existsSync(stationsFilePath)) {
      throw new Error(`stations.json not found at ${stationsFilePath}`);
    }
    const stationsRaw = fs.readFileSync(stationsFilePath, "utf8");
    const stations: Station[] = JSON.parse(stationsRaw);

    // 1. Seed Stations
    console.log(`Seeding ${stations.length} stations...`);
    const { data: seededStations, error: stationsError } = await supabase
      .from("stations")
      .upsert(
        stations.map((s) => ({
          id: s.id,
          name: s.name,
          code: s.code,
          lat: s.lat,
          lng: s.lng,
          zone: s.zone,
          platforms: s.platforms,
        })),
        { onConflict: "id" }
      )
      .select();

    if (stationsError) {
      console.error("❌ Error seeding stations:", stationsError);
      process.exit(1);
    }
    console.log(`Successfully seeded ${seededStations?.length || 0} stations.`);

    // 2. Seed Trains
    console.log(`Seeding ${SEED_TRAINS.length} trains...`);
    const dbTrains = SEED_TRAINS.map((train) => {
      const currentStationCode = train.route[train.current_station_index];
      const station = stations.find((s) => s.code === currentStationCode);

      const current_lat = station ? station.lat : 20.5937;
      const current_lng = station ? station.lng : 78.9629;

      return {
        id: train.id,
        name: train.name,
        number: train.number,
        origin: train.origin,
        destination: train.destination,
        route: train.route,
        current_station_index: train.current_station_index,
        current_lat,
        current_lng,
        scheduled_arrival: train.scheduled_arrival,
        actual_arrival: train.actual_arrival,
        delay_minutes: train.delay_minutes,
        status: train.status,
        passengers: train.passengers,
        updated_at: train.updated_at,
      };
    });

    const { data: seededTrains, error: trainsError } = await supabase
      .from("trains")
      .upsert(dbTrains, { onConflict: "id" })
      .select();

    if (trainsError) {
      console.error("❌ Error seeding trains:", trainsError);
      process.exit(1);
    }
    console.log(`Successfully seeded ${seededTrains?.length || 0} trains.`);

    console.log("✅ Database seeded successfully!");
  } catch (err) {
    console.error("❌ Catch block error seeding database:", err);
    process.exit(1);
  }
}

seedDatabase().catch((err) => {
  console.error("Unhandled rejection:", err);
  process.exit(1);
});
