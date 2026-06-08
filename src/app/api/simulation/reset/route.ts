import { NextResponse } from "next/server";
import { simulationEngine } from "@/lib/simulation/engine";

export async function POST() {
  try {
    await simulationEngine.reset();
    return NextResponse.json({ success: true, message: "Simulation reset complete" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
