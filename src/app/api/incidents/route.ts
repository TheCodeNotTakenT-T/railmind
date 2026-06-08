import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "active";

    const supabase = createServerSupabaseClient();
    let query = supabase.from("incidents").select("*").order("detected_at", { ascending: false });

    if (status === "active") {
      query = query.eq("status", "active");
    } else if (status === "resolved") {
      query = query.eq("status", "resolved");
    }

    const { data: incidents, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const severityPriority: Record<string, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    const sortedIncidents = [...(incidents || [])].sort((a, b) => {
      const aPriority = severityPriority[a.severity] ?? 4;
      const bPriority = severityPriority[b.severity] ?? 4;
      return aPriority - bPriority;
    });

    return NextResponse.json({ incidents: sortedIncidents, total: sortedIncidents.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
