import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import type { Train } from "@/lib/types";

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data: trains, error } = await supabase.from("trains").select("*");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const statusPriority: Record<string, number> = {
      critical: 0,
      delayed: 1,
      on_time: 2,
    };

    const sortedTrains = [...(trains || [])].sort((a: Train, b: Train) => {
      const aPriority = statusPriority[a.status] ?? 3;
      const bPriority = statusPriority[b.status] ?? 3;
      return aPriority - bPriority;
    });

    return NextResponse.json({ trains: sortedTrains, total: sortedTrains.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
