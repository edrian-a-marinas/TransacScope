import { useEffect, useState, useRef } from "react"
import type { ReactNode } from 'react'
import api from "@/services/apiClient"

function scheduleNextCheck(
  checkServerHealth: () => void,
  timeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
  delay: number
) {
  if (timeoutRef.current) clearTimeout(timeoutRef.current);
  timeoutRef.current = setTimeout(checkServerHealth, delay);
}

export function useServerCheck() {
  const [serverStatus, setServerStatus] = useState('connected');
  const [showTopbar, setShowTopbar] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function checkServerHealth() {
      try {
        await api.get("health/");
        if (serverStatus !== 'connected') {
          setServerStatus('connected');
          setShowTopbar(true);
          setTimeout(() => setShowTopbar(false), 3000);
        }
        scheduleNextCheck(checkServerHealth, timeoutRef, 90000);
      } catch {
        if (serverStatus !== 'disconnected') {
          setServerStatus('disconnected');
          setShowTopbar(true);
        }
        scheduleNextCheck(checkServerHealth, timeoutRef, 3000);
      }
    }
    checkServerHealth();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [serverStatus]);

  return { serverStatus, showTopbar };
}

type ServerStatusProps = {
  children: ReactNode;
};

export function ServerStatus({ children }: ServerStatusProps) {
  const { serverStatus, showTopbar } = useServerCheck();

  return (
    <div style={{ display: "contents" }}>
      {showTopbar && (
        <div
          style={{
            position:        "fixed",
            top:             0,
            left:            0,
            right:           0,
            zIndex:          50,
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
            gap:             "0.5rem",
            padding:         "0.5rem 1rem",
            fontSize:        "0.8rem",
            fontWeight:      600,
            letterSpacing:   "0.01em",
            transition:      "background-color 0.2s ease",
            ...(serverStatus === 'connected'
              ? {
                  backgroundColor: "hsl(var(--income) / 0.12)",
                  borderBottom:    "1px solid hsl(var(--income) / 0.25)",
                  color:           "hsl(var(--income))",
                }
              : {
                  backgroundColor: "hsl(var(--expense) / 0.12)",
                  borderBottom:    "1px solid hsl(var(--expense) / 0.25)",
                  color:           "hsl(var(--expense))",
                }
            ),
          }}
        >
          <span
            style={{
              display:         "inline-block",
              width:           "6px",
              height:          "6px",
              borderRadius:    "50%",
              backgroundColor: serverStatus === 'connected'
                ? "hsl(var(--income))"
                : "hsl(var(--expense))",
              flexShrink:      0,
              ...(serverStatus === 'disconnected' && {
                animation: "ts-pulse 1s ease-in-out infinite",
              }),
            }}
          />
          {serverStatus === 'connected'
            ? 'Server reconnected'
            : 'Server is down — reconnecting…'}
        </div>
      )}
      {children}
    </div>
  );
}