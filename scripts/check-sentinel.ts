import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  const { data } = await sb
    .from("incidents")
    .select("id, severity, status, sentinel_analysis, cascade_impact")
    .order("detected_at", { ascending: false })
    .limit(3);

  console.log(JSON.stringify(data, null, 2));
}

run().catch(console.error);
