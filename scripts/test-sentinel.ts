import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testSentinel() {
  console.log("🧪 Testing Sentinel Agent via API...\n");

  // TEST CASE 1: Critical — Howrah Rajdhani 25min delay
  console.log("TEST 1: Howrah Rajdhani (12301) — 25 min delay");
  console.log("Expected: CRITICAL severity, recommendAnalysis: true\n");

  const inject1 = await fetch("http://localhost:3000/api/simulation/inject", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trainId: "12301", delayMinutes: 25, reason: "Test case 1" }),
  });
  const { incidentId: id1 } = await inject1.json();
  console.log("Incident created:", id1);

  const analyze1 = await fetch("http://localhost:3000/api/agents/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ incidentId: id1 }),
  });
  const result1 = await analyze1.json();
  console.log("Pipeline result:", result1);

  // Wait 3 seconds for DB to update
  await new Promise((r) => setTimeout(r, 3000));

  const { data: incident1 } = await supabase
    .from("incidents")
    .select("severity, sentinel_analysis")
    .eq("id", id1)
    .single();

  console.log("\n📊 Sentinel Analysis stored in DB:");
  console.log("Severity:", incident1?.severity);
  console.log("Analysis:", JSON.stringify(incident1?.sentinel_analysis, null, 2));
  console.log("\n" + "─".repeat(50) + "\n");

  // TEST CASE 2: Low — small delay on express
  console.log("TEST 2: Saurashtra Express (19019) — 4 min delay");
  console.log("Expected: LOW severity, recommendAnalysis: false\n");

  const inject2 = await fetch("http://localhost:3000/api/simulation/inject", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trainId: "19019", delayMinutes: 4, reason: "Test case 2" }),
  });
  const { incidentId: id2 } = await inject2.json();

  const analyze2 = await fetch("http://localhost:3000/api/agents/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ incidentId: id2 }),
  });
  const result2 = await analyze2.json();
  console.log("Pipeline result 2:", result2);

  await new Promise((r) => setTimeout(r, 3000));

  const { data: incident2 } = await supabase
    .from("incidents")
    .select("severity, sentinel_analysis, status")
    .eq("id", id2)
    .single();

  console.log("Severity:", incident2?.severity);
  console.log("Status (should be resolved for LOW):", incident2?.status);
  console.log("Analysis:", JSON.stringify(incident2?.sentinel_analysis, null, 2));
}

testSentinel().catch(console.error);
