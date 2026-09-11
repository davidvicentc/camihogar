"use client";

import { useEffect } from "react";

const SESSION_KEY = "camihogar-analytics-session";
const HEARTBEAT_MS = 30_000;

function getSessionId() {
  const stored = window.localStorage.getItem(SESSION_KEY);
  if (stored) return stored;

  const sessionId =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(SESSION_KEY, sessionId);
  return sessionId;
}

export function VisitorPresenceTracker() {
  useEffect(() => {
    const sessionId = getSessionId();
    const sendHeartbeat = () => {
      void fetch("/api/analytics/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
        keepalive: true,
      }).catch(() => undefined);
    };

    sendHeartbeat();
    const interval = window.setInterval(sendHeartbeat, HEARTBEAT_MS);
    return () => window.clearInterval(interval);
  }, []);

  return null;
}
