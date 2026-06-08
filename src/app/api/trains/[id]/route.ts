import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();

    // Query 1: Fetch the specific train
    const { data: train, error: trainError } = await supabase
      .from("trains")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (trainError) {
      return NextResponse.json({ error: trainError.message }, { status: 500 });
    }

    if (!train) {
      return NextResponse.json({ error: `Train not found: ${id}` }, { status: 404 });
    }

    // Query 2: Fetch any active incidents for this train
    const { data: incident, error: incidentError } = await supabase
      .from("incidents")
      .select("*")
      .eq("trigger_train_id", id)
      .eq("status", "active")
      .order("detected_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (incidentError) {
      return NextResponse.json({ error: incidentError.message }, { status: 500 });
    }

    return NextResponse.json({ train, incident: incident || null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
