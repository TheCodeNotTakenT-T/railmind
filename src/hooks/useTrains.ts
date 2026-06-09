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
    let isMounted = true;
    const channel = supabase
      .channel(`trains-rt-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "trains" },
        (payload) => {
          if (!isMounted) return;
          const updatedTrain = payload.new as Train;
          setTrains((prev) => {
            const exists = prev.some((t) => t.id === updatedTrain.id);
            const updated = exists
              ? prev.map((t) => (t.id === updatedTrain.id ? updatedTrain : t))
              : [...prev, updatedTrain];
            return sortTrains(updated);
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
  }, []);

  return { trains, loading, error };
}
