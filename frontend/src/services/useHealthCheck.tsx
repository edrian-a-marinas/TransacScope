import { useEffect, useState, useRef, useCallback } from "react"
import type { ReactNode } from 'react'
import api from "@/services/apiClient"

// ── Intervals ──────────────────────────────────────────────────────────────
const HEALTHY_INTERVAL   = 90_000  // poll every 90s when connected
const RETRY_INTERVAL     =  3_000  // retry every 3s when down
const RECONNECT_SHOW_MS  =  3_000  // how long to show "reconnected" banner
const COLD_START_DELAY   =  3_000  // how long before showing cold-start warning

export function useServerCheck() {
  const [serverStatus,  setServerStatus]  = useState<'connected' | 'disconnected'>('connected');
  const [showTopbar,    setShowTopbar]    = useState(false);
  const [showColdStart, setShowColdStart] = useState(false);

  // ── Refs to avoid stale closures ─────────────────────────────────────────
  const statusRef        = useRef<'connected' | 'disconnected'>('connected');
  const timeoutRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coldTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectBannerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep ref in sync with state so recursive callbacks always see current value
  const setStatus = useCallback((next: 'connected' | 'disconnected') => {
    statusRef.current = next;
    setServerStatus(next);
  }, []);

  // ── Hide cold-start banner once AuthContext finishes loading ──────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (sessionStorage.getItem("auth_loaded")) {
        setShowColdStart(false);
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // ── Health check loop ─────────────────────────────────────────────────────
  useEffect(() => {
    const alreadyWoke = sessionStorage.getItem("backend_woke");

    function schedule(delay: number) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(check, delay);
    }

    async function check() {
      try {
        await api.get("health/");

        // ── Success ────────────────────────────────────────────────────────
        setShowColdStart(false);
        sessionStorage.setItem("backend_woke", "true");
        if (coldTimerRef.current) { clearTimeout(coldTimerRef.current); coldTimerRef.current = null; }

        // statusRef.current is always fresh — no stale closure issue
        if (statusRef.current !== 'connected') {
          setStatus('connected');
          setShowTopbar(true);
          if (reconnectBannerRef.current) clearTimeout(reconnectBannerRef.current);
          reconnectBannerRef.current = setTimeout(() => setShowTopbar(false), RECONNECT_SHOW_MS);
        }

        schedule(HEALTHY_INTERVAL);

      } catch (error: any) {
        // ── Failure ────────────────────────────────────────────────────────
        const errorMessage = error?.message || error?.toString() || "";
        const requestUrl = error?.config?.url || "";

        // Log actual error for debugging
        console.log("Health check error:", { message: errorMessage, url: requestUrl, error });

        // Check for Brave ad blocker blocking:
        // - Network Error with no response (blocked before network)
        // - URL points to Render backend (the blocked target)
        // - Error string contains ERR_BLOCKED_BY_CLIENT or similar
        const isBlockedByClient =
          (errorMessage === "Network Error" && !error?.response && requestUrl.includes("transacscope-fastapi.onrender.com")) ||
          errorMessage.includes("ERR_BLOCKED_BY_CLIENT") ||
          errorMessage.includes("net::ERR_BLOCKED_BY_CLIENT") ||
          (errorMessage.includes("Failed to fetch") && !error?.response && requestUrl.includes("onrender"));

        if (isBlockedByClient) {
          console.warn(
            "%c⚠️ Brave Ad Blocker Detected",
            "background: #ff9500; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;"
          );
          console.warn(
            "Your browser (Brave) is blocking the health check request. " +
            "Please turn off Shields for this site (click the lion icon → turn off Shields) " +
            "or use another browser to access the application."
          );
        }

        if (statusRef.current !== 'disconnected') {
          setStatus('disconnected');
          setShowTopbar(true);
          if (reconnectBannerRef.current) clearTimeout(reconnectBannerRef.current);
        }
        schedule(RETRY_INTERVAL);
      }
    }

    // Show cold-start warning if backend hasn't woken yet after 3s
    if (!alreadyWoke) {
      coldTimerRef.current = setTimeout(() => {
        if (!sessionStorage.getItem("auth_loaded")) {
          setShowColdStart(true);
        }
      }, COLD_START_DELAY);
    }

    check(); // kick off immediately

    return () => {
      if (timeoutRef.current)       clearTimeout(timeoutRef.current);
      if (coldTimerRef.current)     clearTimeout(coldTimerRef.current);
      if (reconnectBannerRef.current) clearTimeout(reconnectBannerRef.current);
    };
  }, []); // ← empty deps — loop runs once, reads statusRef not state

  return { serverStatus, showTopbar, showColdStart };
}

// ── ServerStatus wrapper (UI unchanged) ──────────────────────────────────────
type ServerStatusProps = { children: ReactNode };

export function ServerStatus({ children }: ServerStatusProps) {
  const { serverStatus, showTopbar, showColdStart } = useServerCheck();

  return (
    <div style={{ display: "contents" }}>

      {/* Cold start message */}
      {showColdStart && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
          display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
          padding: "0.5rem 1rem", fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.01em",
          backgroundColor: "hsl(45 85% 50% / 0.10)",
          borderBottom: "1px solid hsl(45 85% 50% / 0.25)",
          color: "hsl(45, 85%, 60%)",
        }}>
          <span style={{
            display: "inline-block", width: "6px", height: "6px", borderRadius: "50%",
            backgroundColor: "hsl(45, 85%, 60%)", flexShrink: 0,
            animation: "ts-pulse 1s ease-in-out infinite",
          }} />
          Free tier backend is waking up — this may take 1–2 minutes on first load.
        </div>
      )}

      {/* Reconnect / disconnect topbar */}
      {showTopbar && !showColdStart && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
          display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
          padding: "0.5rem 1rem", fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.01em",
          transition: "background-color 0.2s ease",
          ...(serverStatus === 'connected'
            ? { backgroundColor: "hsl(var(--income) / 0.12)", borderBottom: "1px solid hsl(var(--income) / 0.25)", color: "hsl(var(--income))" }
            : { backgroundColor: "hsl(var(--expense) / 0.12)", borderBottom: "1px solid hsl(var(--expense) / 0.25)", color: "hsl(var(--expense))" }
          ),
        }}>
          <span style={{
            display: "inline-block", width: "6px", height: "6px", borderRadius: "50%",
            backgroundColor: serverStatus === 'connected' ? "hsl(var(--income))" : "hsl(var(--expense))",
            flexShrink: 0,
            ...(serverStatus === 'disconnected' && { animation: "ts-pulse 1s ease-in-out infinite" }),
          }} />
          {serverStatus === 'connected' ? 'Server reconnected' : 'Server is down — reconnecting…'}
        </div>
      )}

      {children}
    </div>
  );
}