import { useEffect, useState, useRef } from "react"
import type { ReactNode } from 'react'
import api from "./apiClient"

function scheduleNextCheck(checkServerHealth: () => void, timeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>, delay: number) {
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

        scheduleNextCheck(checkServerHealth, timeoutRef, 30000); // check server every 30s when connected

      } catch {
        if (serverStatus !== 'disconnected') {
            setServerStatus('disconnected');
            setShowTopbar(true);
        }

        scheduleNextCheck(checkServerHealth, timeoutRef, 1000); // check server every 1s whern disconnected
      }
    }

    checkServerHealth(); // check immediately

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };

  }, [serverStatus]);

  return { serverStatus, showTopbar };
}

type ServerStatusProps = {
  children: ReactNode;
};

export function ServerStatus ({ children }: ServerStatusProps) {
  const { serverStatus, showTopbar } = useServerCheck();

  return (
    <div className={`app-shell ${showTopbar ? 'with-topbar' : ''}`}>
      {showTopbar && (
        <div className={`server-topbar ${serverStatus}`}>
          {serverStatus === 'connected'
            ? '✅ Server reconnected'
            : '🔴 Server is down. Reconnecting...'}
        </div>
      )}

      {children}
    </div>  
  );    
}