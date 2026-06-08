import { NextResponse } from "next/server";
import { DEMO_SCENARIOS } from "@/lib/simulation/scenarios";
import { simulationEngine } from "@/lib/simulation/engine";

export async function POST(request: Request) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    let { trainId, delayMinutes, reason, scenarioPreset } = body;

    if (scenarioPreset) {
      const scenario = DEMO_SCENARIOS.find((s) => s.id === scenarioPreset);
      if (scenario) {
        trainId = scenario.trainId;
        delayMinutes = scenario.delayMinutes;
        reason = scenario.reason;
      }
    }

    if (!trainId || delayMinutes === undefined || delayMinutes === null) {
      return NextResponse.json({ error: "Missing trainId or delayMinutes" }, { status: 400 });
    }

    const incidentId = await simulationEngine.injectDelay(
      trainId,
      Number(delayMinutes),
      reason || "Unknown delay cause"
    );

    return NextResponse.json({ incidentId, trainId, delayMinutes: Number(delayMinutes) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
