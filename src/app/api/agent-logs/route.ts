import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const incidentId = searchParams.get("incidentId");

    const supabase = createServerSupabaseClient();
    let query = supabase
      .from("agent_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (incidentId) {
      query = query.eq("incident_id", incidentId);
    }

    const { data: logs, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ logs: logs || [], total: logs?.length || 0 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
