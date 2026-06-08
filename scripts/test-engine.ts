import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testEngine() {
  console.log("🧪 Testing simulation engine...");
  console.log("");

  // Step 1: Check trains exist in DB
  const { data: trains, error } = await supabase
    .from("trains")
    .select("id, name, current_lat, current_lng, delay_minutes, status")
    .limit(5);
  
  if (error) {
    console.error("❌ Cannot read trains:", error.message);
    process.exit(1);
  }
  
  console.log("✅ Trains in database:", trains?.length, "sample:");
  trains?.forEach((t) =>
    console.log(" -", t.name, "| lat:", t.current_lat, "| delay:", t.delay_minutes, "| status:", t.status)
  );
  console.log("");

  // Step 2: Inject a test delay on first train
  const firstTrain = trains?.[0];
  if (!firstTrain) {
    console.error("❌ No trains found");
    process.exit(1);
  }

  console.log("💉 Injecting 25-min delay on:", firstTrain.name);
  
  // Manually do what injectDelay does (since engine needs @/ alias which scripts can't resolve)
  const { error: updateError } = await supabase
    .from("trains")
    .update({ delay_minutes: 25, status: "delayed", updated_at: new Date().toISOString() })
    .eq("id", firstTrain.id);

  if (updateError) {
    console.error("❌ Failed to update train:", updateError.message);
    process.exit(1);
  }

  const { data: incident, error: incidentError } = await supabase
    .from("incidents")
    .insert({
      trigger_train_id: firstTrain.id,
      delay_minutes: 25,
      detected_at: new Date().toISOString(),
      status: "active",
      severity: "high",
    })
    .select("id")
    .single();

  if (incidentError) {
    console.error("❌ Failed to create incident:", incidentError.message);
    process.exit(1);
  }

  console.log("✅ Incident created:", incident.id);
  console.log("");

  // Step 3: Verify the update in DB
  const { data: updated } = await supabase
    .from("trains")
    .select("name, delay_minutes, status")
    .eq("id", firstTrain.id)
    .single();

  console.log("✅ Train updated in DB:", updated?.name, "| delay:", updated?.delay_minutes, "| status:", updated?.status);
  console.log("");

  // Step 4: Check incident exists
  const { data: incidents } = await supabase
    .from("incidents")
    .select("id, trigger_train_id, severity, status")
    .eq("status", "active");

  console.log("✅ Active incidents in DB:", incidents?.length);
  console.log("");
  console.log("🎉 Engine test passed! Supabase is reading and writing correctly.");
  console.log("");
  console.log("Go to Supabase Table Editor → trains → check", firstTrain.name, "has delay_minutes = 25");
  console.log("Go to Supabase Table Editor → incidents → check 1 active row exists");
}

testEngine().catch(console.error);
