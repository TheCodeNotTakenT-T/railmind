import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  const { data, error } = await sb
    .from("agent_logs")
    .select("id, agent_name, action, input, output, duration_ms, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error fetching agent logs:", error);
    return;
  }

  console.log(JSON.stringify(data, null, 2));
}

run().catch(console.error);
