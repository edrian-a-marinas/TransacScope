// DashboardPage.tsx
import { useState, useContext, useEffect, useRef, useCallback } from "react";
import { cn } from "@/features/dashboard/lib/utils";
import {
  LayoutDashboard,
  ArrowLeftRight,
  FileText,
  FolderOpen,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bell,
  Trash2,
  CheckCheck,
} from "lucide-react";
import { AuthContext } from "../../auth/AuthContext";
import api from "@/services/apiClient";
import Transactions from "./TransactionPage";
import Reports from "./ReportPage";
import ManageUsers from "./ManageUserPage";
import ManageCategories from "../components/modals/ManageCategoriesModal";
import DashboardOverview from "@/features/dashboard/components/overview/DashBoardOverview";
import HandleDeletionRequest from "../components/modals/HandleDeletionRequestModal";

// ── Sidebar tokens ────────────────────────────────────────────────────────────
const S = {
  bg:         "hsl(220,25%,10%)",
  accent:     "hsl(220,20%,16%)",
  accentFg:   "hsl(220,14%,90%)",
  primary:    "hsl(199,89%,48%)",
  muted:      "hsl(220,10%,46%)",
  border:     "hsl(220,20%,18%)",
  foreground: "hsl(220,14%,85%)",
  expense:    "hsl(0,72%,51%)",
};

// ── Notification panel tokens ─────────────────────────────────────────────────
const N = {
  surface:    "hsl(220,20%,12%)",
  surfaceEl:  "hsl(220,18%,16%)",
  surfaceHov: "hsl(220,16%,20%)",
  border:     "hsl(220,16%,22%)",
  fg:         "hsl(220,14%,90%)",
  fgMuted:    "hsl(220,10%,55%)",
  expense:    "hsl(0,72%,51%)",
  warning:    "hsl(45,85%,50%)",
  primary:    "hsl(199,89%,38%)",
};

// ── Types ─────────────────────────────────────────────────────────────────────
type MenuKey = "dashboard" | "transactions" | "reports" | "manageCategories" | "manageUsers";

interface NavItem {
  key:       MenuKey;
  label:     string;
  icon:      typeof LayoutDashboard;
  adminOnly?: boolean;
}

interface Notification {
  id:                number;
  recipient_user_id: number;
  type:              string;
  payload:           Record<string, any>;
  is_read:           boolean;
  created_at:        string;
}

const navItems: NavItem[] = [
  { key: "dashboard",        label: "Dashboard",    icon: LayoutDashboard },
  { key: "transactions",     label: "Transactions", icon: ArrowLeftRight },
  { key: "reports",          label: "Reports",      icon: FileText },
  { key: "manageCategories", label: "Categories",   icon: FolderOpen, adminOnly: true },
  { key: "manageUsers",      label: "Users",        icon: Users,      adminOnly: true },
];

// ── Relative time helper ──────────────────────────────────────────────────────
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Notification icon by type ─────────────────────────────────────────────────
function NotifIcon({ type }: { type: string }) {
  if (type === "deletion_request") {
    return (
      <div style={{
        width: "2rem", height: "2rem", borderRadius: "0.5rem", flexShrink: 0,
        backgroundColor: "hsl(0 72% 51% / 0.12)",
        border: `1px solid ${N.expense}40`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Trash2 style={{ width: "0.85rem", height: "0.85rem", color: N.expense }} />
      </div>
    );
  }
  return (
    <div style={{
      width: "2rem", height: "2rem", borderRadius: "0.5rem", flexShrink: 0,
      backgroundColor: "hsl(199 89% 38% / 0.12)",
      border: `1px solid ${N.primary}40`,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <Bell style={{ width: "0.85rem", height: "0.85rem", color: N.primary }} />
    </div>
  );
}

// ── Notification message builder ──────────────────────────────────────────────
function notifMessage(notif: Notification): { title: string; body: string } {
  if (notif.type === "deletion_request") {
    const p = notif.payload;
    const type  = p.transaction_type ?? "transaction";
    const name  = p.requester_name   ?? "A user";
    const amt   = p.amount           ? ` (₱${parseFloat(p.amount).toLocaleString()})` : "";
    return {
      title: "Deletion Request",
      body:  `${name} requested to delete a ${type.toLowerCase()}${amt}`,
    };
  }
  return { title: "Notification", body: "You have a new notification" };
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { logout, user } = useContext(AuthContext);

  const [selectedMenu,    setSelectedMenu]    = useState<MenuKey>("dashboard");
  const [collapsed,       setCollapsed]       = useState(false);
  const [hoveredMenu,     setHoveredMenu]     = useState<MenuKey | null>(null);
  const [hoveredLogout,   setHoveredLogout]   = useState(false);

  // ── Notification state ──────────────────────────────────────────────────
  const [notifications,    setNotifications]    = useState<Notification[]>([]);
  const [unreadCount,      setUnreadCount]      = useState(0);
  const [panelOpen,        setPanelOpen]        = useState(false);
  const [loadingNotifs,    setLoadingNotifs]    = useState(false);

  // Deep-link state: when a notif is clicked, open the deletion modal at a specific request
  const [deepLinkRequestId,       setDeepLinkRequestId]       = useState<number | undefined>();
  const [showDeletionModalDirect,  setShowDeletionModalDirect] = useState(false);

  const panelRef   = useRef<HTMLDivElement>(null);
  const bellRef    = useRef<HTMLButtonElement>(null);
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  const token     = localStorage.getItem("access_token");
  const tokenType = localStorage.getItem("token_type");
  const authHeader = token && tokenType ? { Authorization: `${tokenType} ${token}` } : {};

  if (!user) return <p>Loading...</p>;

  const userID   = user.id;
  const userRole = user.role_id;
  const isAdmin  = userRole === 1;

  const roleLabel =
    userRole === 1 && userID === 1 ? "Super Admin"
    : userRole === 1               ? "Admin"
    :                                "Standard User";

  // ── Poll unread count every 30s ─────────────────────────────────────────
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get("api/notifications/unread-count", { headers: authHeader });
      setUnreadCount(res.data.unread_count ?? 0);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    pollRef.current = setInterval(fetchUnreadCount, 30_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchUnreadCount]);

  // ── Close panel on outside click ────────────────────────────────────────
  useEffect(() => {
    if (!panelOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current  && !panelRef.current.contains(e.target as Node) &&
        bellRef.current   && !bellRef.current.contains(e.target as Node)
      ) {
        setPanelOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [panelOpen]);

  // ── Open panel: load full list + mark all read ──────────────────────────
  const openPanel = async () => {
    if (panelOpen) { setPanelOpen(false); return; }
    setPanelOpen(true);
    setLoadingNotifs(true);
    try {
      // Fetch first so panel shows data immediately
      const res = await api.get("api/notifications/", { headers: authHeader });
      setNotifications(res.data ?? []);
      // Then mark all read (badge clears after data is already displayed)
      if (unreadCount > 0) {
        await api.patch("api/notifications/read-all", {}, { headers: authHeader });
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      }
    } catch { /* silent */ }
    finally { setLoadingNotifs(false); }
  };

  // ── Click a single notification ─────────────────────────────────────────
  const handleNotifClick = async (notif: Notification) => {
    // Mark individual as read optimistically
    if (!notif.is_read) {
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      try {
        await api.patch(`api/notifications/${notif.id}/read`, {}, { headers: authHeader });
      } catch { /* silent */ }
    }

    if (notif.type === "deletion_request" && isAdmin) {
      const requestId = notif.payload.request_id;
      setPanelOpen(false);
      setDeepLinkRequestId(requestId);
      setShowDeletionModalDirect(true);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <title>TransacScope Overview</title>

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside
        style={{ backgroundColor: S.bg, borderRight: `1px solid ${S.border}` }}
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex flex-col transition-all duration-300",
          collapsed ? "w-[68px]" : "w-[220px]"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 px-4" style={{ borderBottom: `1px solid ${S.border}` }}>
          <img
            src="../../../../../src/assets/vite.svg"
            alt="TransacScope"
            className="h-8 w-8 shrink-0 cursor-pointer"
            onClick={() => setSelectedMenu("dashboard")}
          />
          {!collapsed && (
            <span className="text-sm font-bold tracking-tight" style={{ color: S.foreground }}>
              TransacScope
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navItems
            .filter(item => !item.adminOnly || isAdmin)
            .map(item => {
              const active  = selectedMenu === item.key;
              const hovered = hoveredMenu === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setSelectedMenu(item.key)}
                  onMouseEnter={() => setHoveredMenu(item.key)}
                  onMouseLeave={() => setHoveredMenu(null)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: active || hovered ? S.accent : "transparent",
                    color:  active ? S.primary : hovered ? S.accentFg : S.muted,
                    border: "none", cursor: "pointer",
                  }}
                >
                  <item.icon
                    className="h-4 w-4 shrink-0"
                    style={{ color: active ? S.primary : hovered ? S.accentFg : S.muted }}
                  />
                  {!collapsed && <span>{item.label}</span>}
                </button>
              );
            })}
        </nav>

        {/* Footer */}
        <div className="p-3" style={{ borderTop: `1px solid ${S.border}` }}>
          {!collapsed && (
            <div className="mb-3 rounded-lg px-3 py-2" style={{ backgroundColor: S.accent }}>
              <p className="text-xs font-semibold" style={{ color: S.accentFg }}>{user.first_name}</p>
              <p className="text-[10px]" style={{ color: S.muted }}>{roleLabel}</p>
            </div>
          )}
          <button
            onClick={logout}
            onMouseEnter={() => setHoveredLogout(true)}
            onMouseLeave={() => setHoveredLogout(false)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
            style={{
              backgroundColor: hoveredLogout ? S.accent : "transparent",
              color:  hoveredLogout ? S.expense : S.muted,
              border: "none", cursor: "pointer",
            }}
          >
            <LogOut className="h-4 w-4 shrink-0" style={{ color: hoveredLogout ? S.expense : S.muted }} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full shadow-sm transition-colors"
          style={{ border: `1px solid ${S.border}`, backgroundColor: S.bg, color: S.muted, cursor: "pointer" }}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <main className={cn("flex-1 transition-all duration-300", collapsed ? "ml-[68px]" : "ml-[220px]")}>

        {/* ── Top bar with notification bell ───────────────────────────────── */}
        <div style={{
          position:     "sticky",
          top:          0,
          zIndex:       20,
          display:      "flex",
          justifyContent: "flex-end",
          alignItems:   "center",
          padding:      "0.75rem 1.5rem",
          background:   "hsl(220,14%,97%)",
          borderBottom: "1px solid hsl(220,13%,89%)",
        }}>
          {/* Bell button */}
          <div style={{ position: "relative" }}>
            <button
              ref={bellRef}
              onClick={openPanel}
              style={{
                position:     "relative",
                background:   panelOpen ? "hsl(220,13%,89%)" : "transparent",
                border:       "1px solid hsl(220,13%,89%)",
                borderRadius: "0.5rem",
                padding:      "0.4rem",
                cursor:       "pointer",
                display:      "flex",
                alignItems:   "center",
                color:        "hsl(220,14%,40%)",
                transition:   "background 0.15s",
              }}
            >
              <Bell style={{ width: "1.1rem", height: "1.1rem" }} />

              {/* Unread badge */}
              {unreadCount > 0 && (
                <span style={{
                  position:        "absolute",
                  top:             "-4px",
                  right:           "-4px",
                  minWidth:        "1rem",
                  height:          "1rem",
                  borderRadius:    "999px",
                  backgroundColor: N.expense,
                  color:           "#fff",
                  fontSize:        "0.6rem",
                  fontWeight:      700,
                  display:         "flex",
                  alignItems:      "center",
                  justifyContent:  "center",
                  padding:         "0 0.25rem",
                  lineHeight:      1,
                }}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {/* ── Notification panel ─────────────────────────────────────── */}
            {panelOpen && (
              <div
                ref={panelRef}
                style={{
                  position:     "absolute",
                  top:          "calc(100% + 8px)",
                  right:        0,
                  width:        "360px",
                  background:   N.surface,
                  border:       `1px solid ${N.border}`,
                  borderRadius: "0.75rem",
                  boxShadow:    "0 16px 40px rgba(0,0,0,0.35)",
                  overflow:     "hidden",
                  zIndex:       100,
                }}
              >
                {/* Panel header */}
                <div style={{
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "space-between",
                  padding:        "0.85rem 1rem",
                  borderBottom:   `1px solid ${N.border}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Bell style={{ width: "0.85rem", height: "0.85rem", color: N.fgMuted }} />
                    <span style={{ fontSize: "0.82rem", fontWeight: 700, color: N.fg }}>
                      Notifications
                    </span>
                  </div>
                  {notifications.some(n => !n.is_read) && (
                    <button
                      onClick={async () => {
                        await api.patch("api/notifications/read-all", {}, { headers: authHeader });
                        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                        setUnreadCount(0);
                      }}
                      style={{
                        display:      "flex",
                        alignItems:   "center",
                        gap:          "0.25rem",
                        background:   "transparent",
                        border:       "none",
                        color:        N.fgMuted,
                        fontSize:     "0.7rem",
                        cursor:       "pointer",
                        padding:      "0.2rem 0.4rem",
                        borderRadius: "0.35rem",
                      }}
                    >
                      <CheckCheck style={{ width: "0.75rem", height: "0.75rem" }} />
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Panel body */}
                <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                  {loadingNotifs && (
                    <p style={{ color: N.fgMuted, fontSize: "0.78rem", padding: "1.5rem", textAlign: "center" }}>
                      Loading…
                    </p>
                  )}

                  {!loadingNotifs && notifications.length === 0 && (
                    <div style={{ padding: "2.5rem 1rem", textAlign: "center" }}>
                      <Bell style={{ width: "1.5rem", height: "1.5rem", color: N.fgMuted, margin: "0 auto 0.5rem", opacity: 0.4 }} />
                      <p style={{ color: N.fgMuted, fontSize: "0.78rem", margin: 0 }}>No notifications yet</p>
                    </div>
                  )}

                  {!loadingNotifs && notifications.map((notif, idx) => {
                    const { title, body } = notifMessage(notif);
                    const isClickable = notif.type === "deletion_request" && isAdmin;
                    return (
                      <div
                        key={notif.id}
                        onClick={() => isClickable && handleNotifClick(notif)}
                        style={{
                          display:          "flex",
                          gap:              "0.65rem",
                          padding:          "0.75rem 1rem",
                          borderBottom:     idx < notifications.length - 1 ? `1px solid ${N.border}` : "none",
                          cursor:           isClickable ? "pointer" : "default",
                          backgroundColor:  notif.is_read ? "transparent" : "hsl(199 89% 38% / 0.05)",
                          transition:       "background 0.1s",
                        }}
                        onMouseEnter={e => { if (isClickable) e.currentTarget.style.backgroundColor = N.surfaceHov; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = notif.is_read ? "transparent" : "hsl(199 89% 38% / 0.05)"; }}
                      >
                        <NotifIcon type={notif.type} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                            <span style={{ fontSize: "0.78rem", fontWeight: 600, color: N.fg }}>{title}</span>
                            <span style={{ fontSize: "0.67rem", color: N.fgMuted, whiteSpace: "nowrap", flexShrink: 0 }}>
                              {relativeTime(notif.created_at)}
                            </span>
                          </div>
                          <p style={{ fontSize: "0.73rem", color: N.fgMuted, margin: "0.15rem 0 0", lineHeight: 1.4 }}>
                            {body}
                          </p>
                          {isClickable && (
                            <p style={{ fontSize: "0.67rem", color: N.primary, margin: "0.25rem 0 0", fontWeight: 500 }}>
                              Click to review →
                            </p>
                          )}
                        </div>
                        {/* Unread dot */}
                        {!notif.is_read && (
                          <div style={{
                            width: "6px", height: "6px", borderRadius: "999px",
                            backgroundColor: N.primary, flexShrink: 0, marginTop: "0.35rem",
                          }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Page content ─────────────────────────────────────────────────── */}
        <div className="p-6 lg:p-8">
          {selectedMenu === "dashboard"        && <DashboardOverview userRole={userRole} userId={userID} />}
          {selectedMenu === "transactions"     && <Transactions />}
          {selectedMenu === "reports"          && <Reports />}
          {selectedMenu === "manageCategories" && isAdmin && (
            <ManageCategories onClose={() => setSelectedMenu("dashboard")} />
          )}
          {selectedMenu === "manageUsers"      && isAdmin && <ManageUsers />}
        </div>
      </main>

      {/* ── Deep-link deletion modal: opened from notification click ─────── */}
      {showDeletionModalDirect && (
        <HandleDeletionRequest
          initialRequestId={deepLinkRequestId}
          onClose={() => {
            setShowDeletionModalDirect(false);
            setDeepLinkRequestId(undefined);
          }}
        />
      )}
    </div>
  );
}