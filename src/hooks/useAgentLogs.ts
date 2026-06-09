"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { AgentLog } from "@/lib/types";

export function useAgentLogs(incidentId?: string) {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Initial Fetch
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const url = incidentId
          ? `/api/agent-logs?incidentId=${incidentId}`
          : "/api/agent-logs";
        const res = await fetch(url);
        const data = await res.json();
        if (data.logs) {
          setLogs(data.logs.slice(0, 20));
        }
      } catch (err) {
        console.error("Failed to fetch agent logs:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLogs();
  }, [incidentId]);

  // Realtime Subscription
  useEffect(() => {
    let isMounted = true;
    const channel = supabase
      .channel(`agent-logs-rt-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "agent_logs" },
        (payload) => {
          if (!isMounted) return;
          const newLog = payload.new as AgentLog;

          // If filtering by incidentId, only add if it matches
          if (incidentId && newLog.incident_id !== incidentId) return;

          setLogs((prev) => {
            const exists = prev.some((l) => l.id === newLog.id);
            if (exists) return prev;
            
            const updated = [newLog, ...prev];
            return updated.slice(0, 20); // Keep max 20 entries
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "agent_logs" },
        (payload) => {
          if (!isMounted) return;
          const updatedLog = payload.new as AgentLog;
          
          setLogs((prev) => prev.map((l) => (l.id === updatedLog.id ? updatedLog : l)));
        }
      );

    Promise.resolve().then(() => {
      if (isMounted) channel.subscribe();
    });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [incidentId]);

  // isAgentRunning: true if any log has duration_ms === null (agent still running)
  // AND that log was created in the last 10 seconds
  const isAgentRunning = logs.some((log) => {
    if (log.duration_ms !== null) return false;
    const logTime = new Date(log.created_at).getTime();
    const now = Date.now();
    return now - logTime < 10000; // within last 10 seconds
  });

  // Per-agent last action summary (useful for the agent feed UI)
  const agentSummary = {
    Sentinel: logs.find((l) => l.agent_name === "Sentinel"),
    CascadeAnalyzer: logs.find((l) => l.agent_name === "CascadeAnalyzer"),
    Resolution: logs.find((l) => l.agent_name === "Resolution"),
    Communication: logs.find((l) => l.agent_name === "Communication"),
    Orchestrator: logs.find((l) => l.agent_name === "Orchestrator"),
  };

  return { logs, loading, isAgentRunning, agentSummary };
}
