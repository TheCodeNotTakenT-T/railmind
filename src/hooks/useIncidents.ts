"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Incident } from "@/lib/types";

const severityPriority: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const sortIncidents = (incidents: Incident[]): Incident[] => {
  return [...incidents].sort((a, b) => {
    const aPriority = severityPriority[a.severity] ?? 4;
    const bPriority = severityPriority[b.severity] ?? 4;
    
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    
    return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime();
  });
};

export function useIncidents(statusFilter: "active" | "resolved" | "all" = "active") {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  // Initial Fetch
  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const res = await fetch(`/api/incidents?status=${statusFilter}`);
        const data = await res.json();
        if (data.incidents) {
          setIncidents(sortIncidents(data.incidents));
        }
      } catch (err) {
        console.error("Failed to fetch incidents:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchIncidents();
  }, [statusFilter]);

  // Realtime Subscription
  useEffect(() => {
    let isMounted = true;
    const channel = supabase
      .channel(`incidents-rt-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "incidents" },
        (payload) => {
          if (!isMounted) return;
          const newIncident = payload.new as Incident;
          
          // Apply status filters on insert
          if (statusFilter === "active" && newIncident.status !== "active") return;
          if (statusFilter === "resolved" && newIncident.status !== "resolved") return;
          
          setIncidents((prev) => {
            const exists = prev.some((i) => i.id === newIncident.id);
            if (exists) return prev;
            return sortIncidents([newIncident, ...prev]);
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "incidents" },
        (payload) => {
          if (!isMounted) return;
          const updatedIncident = payload.new as Incident;
          
          setIncidents((prev) => {
            // Remove from active list if now resolved
            if (statusFilter === "active" && updatedIncident.status === "resolved") {
              return prev.filter((i) => i.id !== updatedIncident.id);
            }
            
            // Add to resolved list if updated to resolved
            if (statusFilter === "resolved" && updatedIncident.status === "resolved") {
              const exists = prev.some((i) => i.id === updatedIncident.id);
              if (!exists) {
                return sortIncidents([updatedIncident, ...prev]);
              }
            }
            
            // Update in place
            const updated = prev.map((i) => (i.id === updatedIncident.id ? updatedIncident : i));
            return sortIncidents(updated);
          });
        }
      );

    // Defer subscribe to next microtask so the channel is fully configured
    Promise.resolve().then(() => {
      if (isMounted) channel.subscribe();
    });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [statusFilter]);

  // Count of critical incidents
  const criticalCount = incidents.filter((i) => i.severity === "critical").length;

  return { incidents, loading, criticalCount };
}
