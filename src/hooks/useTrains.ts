"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Train } from "@/lib/types";

const statusPriority: Record<string, number> = {
  critical: 0,
  delayed: 1,
  on_time: 2,
};

const sortTrains = (trains: Train[]): Train[] => {
  return [...trains].sort((a, b) => {
    const aPriority = statusPriority[a.status] ?? 3;
    const bPriority = statusPriority[b.status] ?? 3;
    
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    
    return b.delay_minutes - a.delay_minutes;
  });
};

export function useTrains() {
  const [trains, setTrains] = useState<Train[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initial fetch and polling fallback
  useEffect(() => {
    const fetchTrains = async () => {
      try {
        const res = await fetch("/api/trains");
        const data = await res.json();
        if (data.trains) {
          setTrains(sortTrains(data.trains));
        }
        setLoading(false);
      } catch (err) {
        setError("Failed to fetch trains");
        setLoading(false);
      }
    };

    fetchTrains();

    const pollInterval = setInterval(fetchTrains, 5000);

    return () => clearInterval(pollInterval);
  }, []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("trains-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "trains" },
        (payload) => {
          const updatedTrain = payload.new as Train;
          setTrains((prev) => {
            // Check if train exists, if not add it, otherwise update
            const exists = prev.some((t) => t.id === updatedTrain.id);
            const updated = exists
              ? prev.map((t) => (t.id === updatedTrain.id ? updatedTrain : t))
              : [...prev, updatedTrain];
            return sortTrains(updated);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { trains, loading, error };
}
