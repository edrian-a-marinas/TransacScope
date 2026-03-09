import { useState, useContext, useEffect, useRef } from "react";
import { cn } from "@/features/dashboard/lib/utilsForUiCn";
import {
  LayoutDashboard, ArrowLeftRight, FileText,
  FolderOpen, Users, LogOut, ChevronLeft, ChevronRight, Settings,
  Sun, Moon, AlertTriangle, X,
} from "lucide-react";
import { AuthContext } from "../../auth/AuthContext";
import { useTheme } from "@/features/dashboard/lib/ThemeContext";
import api from "@/services/apiClient";
import Transactions          from "./TransactionPage";
import Reports               from "./ReportPage";
import ManageUsers           from "./ManageUserPage";
import SettingsPage          from "./SettingsPage";
import ManageCategories      from "../components/modals/ManageCategoriesModal";
import DashboardOverview     from "@/features/dashboard/components/overview/DashBoardOverview";
import HandleDeletionRequest from "../components/modals/HandleDeletionRequestModal";
import NotificationPanel     from "../components/ui/NotificationPanel";

const S = {
  bg:         "hsl(220,25%,10%)",
  accent:     "hsl(220,20%,16%)",
  accentFg:   "hsl(220,14%,90%)",
  primary:    "hsl(199,89%,48%)",
  muted:      "hsl(220,10%,46%)",
  border:     "hsl(220,20%,18%)",
  foreground: "hsl(220,14%,85%)",
  expense:    "hsl(0,72%,51%)",
  warning:    "hsl(45,85%,50%)",
};

type MenuKey = "dashboard" | "transactions" | "reports" | "manageCategories" | "manageUsers" | "settings";
interface NavItem {
  key:        MenuKey;
  label:      string;
  icon:       typeof LayoutDashboard;
  adminOnly?: boolean;
}
const navItems: NavItem[] = [
  { key: "dashboard",        label: "Dashboard",    icon: LayoutDashboard },
  { key: "transactions",     label: "Transactions", icon: ArrowLeftRight },
  { key: "reports",          label: "Reports",      icon: FileText },
  { key: "manageCategories", label: "Categories",   icon: FolderOpen, adminOnly: true },
  { key: "manageUsers",      label: "Users",        icon: Users,      adminOnly: true },
];

const WARN_DAYS   = 7;
const URGENT_DAYS = 3;
const AUTO_HIDE   = 15000; // ms

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

// ── Inline topbar toast ───────────────────────────────────────────────────────
function PwExpiryToast({
  expiresAt,
  onDismiss,
  onGoToSettings,
}: {
  expiresAt:      string;
  onDismiss:      () => void;
  onGoToSettings: () => void;
}) {
  const days      = daysUntil(expiresAt);
  const isUrgent  = days <= URGENT_DAYS;
  const color     = isUrgent ? "hsl(0,72%,51%)" : "hsl(45,85%,50%)";
  const bgColor   = isUrgent ? "hsl(0 72% 51% / 0.12)" : "hsl(45 85% 50% / 0.1)";
  const bdColor   = isUrgent ? "hsl(0 72% 51% / 0.35)"  : "hsl(45 85% 50% / 0.4)";

  const [visible,  setVisible]  = useState(false); // start hidden for slide-in
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoveredRef = useRef(false);

  const startTimer = () => {
    timerRef.current = setTimeout(() => {
      if (!hoveredRef.current) { setVisible(false); setTimeout(onDismiss, 300); }
    }, AUTO_HIDE);
  };

  useEffect(() => {
    // tiny delay so CSS transition plays on mount
    const mount = setTimeout(() => setVisible(true), 30);
    startTimer();
    return () => { clearTimeout(mount); if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const pause  = () => { hoveredRef.current = true;  if (timerRef.current) clearTimeout(timerRef.current); };
  const resume = () => { hoveredRef.current = false; startTimer(); };
  const close  = () => { setVisible(false); setTimeout(onDismiss, 300); };

  const label = days <= 0
    ? "Password expired!"
    : days === 1
    ? "Password expires tomorrow!"
    : `Password expires in ${days} day${days !== 1 ? "s" : ""}`;

  return (
    <div
      onMouseEnter={pause}
      onMouseLeave={resume}
      style={{
        display:       "flex",
        alignItems:    "center",
        gap:           "0.5rem",
        padding:       "0.35rem 0.75rem 0.35rem 0.6rem",
        borderRadius:  "0.5rem",
        background:    bgColor,
        border:        `1px solid ${bdColor}`,
        borderLeft:    `3px solid ${color}`,
        fontSize:      "0.75rem",
        whiteSpace:    "nowrap",
        overflow:      "hidden",
        maxWidth:      visible ? "480px" : "0px",
        opacity:       visible ? 1 : 0,
        transition:    "max-width 0.35s ease, opacity 0.3s ease",
      }}
    >
      <AlertTriangle style={{ width: "0.8rem", height: "0.8rem", color, flexShrink: 0 }} />
      <span style={{ color, fontWeight: 700, flexShrink: 0 }}>{label}</span>
      <span style={{ color: "hsl(var(--page-fg-muted))", flexShrink: 0 }}>—</span>
      <button
        onClick={onGoToSettings}
        style={{ background: "none", border: "none", padding: 0, color, fontWeight: 700, cursor: "pointer", fontSize: "0.75rem", textDecoration: "underline", flexShrink: 0 }}
      >
        Update now
      </button>
      <button
        onClick={close}
        style={{ background: "none", border: "none", padding: "0.1rem", cursor: "pointer", color: "hsl(var(--page-fg-muted))", display: "flex", alignItems: "center", flexShrink: 0, marginLeft: "0.15rem" }}
        title="Dismiss"
      >
        <X style={{ width: "0.7rem", height: "0.7rem" }} />
      </button>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { logout, user }        = useContext(AuthContext);
  const { isDark, toggleTheme } = useTheme();
  const [selectedMenu,            setSelectedMenu]            = useState<MenuKey>("dashboard");
  const [collapsed,               setCollapsed]               = useState(false);
  const [hoveredMenu,             setHoveredMenu]             = useState<MenuKey | null>(null);
  const [hoveredLogout,           setHoveredLogout]           = useState(false);
  const [hoveredSettings,         setHoveredSettings]         = useState(false);
  const [showLogoutConfirm,       setShowLogoutConfirm]       = useState(false);
  const [deepLinkRequestId,       setDeepLinkRequestId]       = useState<number | undefined>();
  const [showDeletionModalDirect, setShowDeletionModalDirect] = useState(false);

  // ── Expiry toast ──────────────────────────────────────────────────────────
  const [expiresAt,     setExpiresAt]     = useState<string | null>(null);
  const [toastVisible,  setToastVisible]  = useState(false);

  const isDeactivated = !user?.is_active;

  useEffect(() => {
    if (isDeactivated && selectedMenu !== "settings") setSelectedMenu("settings");
  }, [isDeactivated, selectedMenu]);

  // Fetch expiry on every mount (no localStorage persistence — always shows on refresh)
  useEffect(() => {
    if (!user) return;
    const token     = localStorage.getItem("access_token");
    const tokenType = localStorage.getItem("token_type");
    if (!token || !tokenType) return;

    api.get("api/users/me/password-expiry", {
      headers: { Authorization: `${tokenType} ${token}` },
    }).then(res => {
      const exp: string | null = res.data.expires_at;
      if (!exp) return;
      if (daysUntil(exp) <= WARN_DAYS) {
        setExpiresAt(exp);
        setToastVisible(true);
      }
    }).catch(() => {});
  }, [user]);

  const handleToastDismiss    = () => setToastVisible(false);
  const handleGoToSettings    = () => { setSelectedMenu("settings"); setToastVisible(false); };

  if (!user) return <p>Loading...</p>;

  const userID   = user.id;
  const userRole = user.role_id;
  const isAdmin  = userRole === 1;
  const roleLabel =
    userRole === 1 && userID === 1 ? "Super Admin"
    : userRole === 1               ? "Admin"
    :                                "Standard User";

  const token     = localStorage.getItem("access_token");
  const tokenType = localStorage.getItem("token_type");
  const authHeader = token && tokenType ? { Authorization: `${tokenType} ${token}` } : {};

  const handleDeepLink = (requestId: number) => {
    setDeepLinkRequestId(requestId);
    setShowDeletionModalDirect(true);
  };

  const NavButton = ({ item }: { item: NavItem }) => {
    const active  = selectedMenu === item.key;
    const hovered = hoveredMenu  === item.key;
    const locked  = isDeactivated;
    return (
      <button
        key={item.key}
        onClick={() => !locked && setSelectedMenu(item.key)}
        onMouseEnter={() => setHoveredMenu(item.key)}
        onMouseLeave={() => setHoveredMenu(null)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
        style={{
          backgroundColor: active || hovered ? S.accent : "transparent",
          color:   locked ? S.muted : active ? S.primary : hovered ? S.accentFg : S.muted,
          border:  "none",
          cursor:  locked ? "not-allowed" : "pointer",
          opacity: locked ? 0.45 : 1,
        }}
      >
        <item.icon className="h-4 w-4 shrink-0" style={{ color: locked ? S.muted : active ? S.primary : hovered ? S.accentFg : S.muted }} />
        {!collapsed && <span>{item.label}</span>}
      </button>
    );
  };

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "hsl(var(--background))", transition: "background-color 0.2s ease" }}>
      <title>TransacScope Overview</title>

      {/* ── Sidebar ── */}
      <aside
        style={{ backgroundColor: S.bg, borderRight: `1px solid ${S.border}` }}
        className={cn("fixed inset-y-0 left-0 z-30 flex flex-col transition-all duration-300", collapsed ? "w-[68px]" : "w-[220px]")}
      >
        <div className="flex h-16 items-center gap-2 px-4" style={{ borderBottom: `1px solid ${S.border}` }}>
          {collapsed
            ? <img src="/transacScope1.svg" alt="TransacScope" className="h-8 w-8 shrink-0 cursor-pointer object-contain" onClick={() => !isDeactivated && setSelectedMenu("dashboard")} />
            : <img src="/transacScope1.svg" alt="TransacScope" style={{ height: "48px", width: "auto", cursor: "pointer" }} onClick={() => !isDeactivated && setSelectedMenu("dashboard")} />
          }
        </div>
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navItems.filter(item => !item.adminOnly || isAdmin).map(item => <NavButton key={item.key} item={item} />)}
        </nav>
        <div className="p-3" style={{ borderTop: `1px solid ${S.border}` }}>
          {!collapsed && (
            <div className="mb-3 rounded-lg px-3 py-2" style={{ backgroundColor: S.accent }}>
              <p className="text-xs font-semibold" style={{ color: S.accentFg }}>{user.first_name}</p>
              <p className="text-[10px]" style={{ color: S.muted }}>{roleLabel} - ID #{userID}</p>
            </div>
          )}
          <button
            onClick={() => setSelectedMenu("settings")}
            onMouseEnter={() => setHoveredSettings(true)}
            onMouseLeave={() => setHoveredSettings(false)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors mb-1"
            style={{ backgroundColor: selectedMenu === "settings" || hoveredSettings ? S.accent : "transparent", color: selectedMenu === "settings" ? S.primary : hoveredSettings ? S.accentFg : S.muted, border: "none", cursor: "pointer" }}
          >
            <Settings className="h-4 w-4 shrink-0" style={{ color: selectedMenu === "settings" ? S.primary : hoveredSettings ? S.accentFg : S.muted }} />
            {!collapsed && <span>Settings</span>}
          </button>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            onMouseEnter={() => setHoveredLogout(true)}
            onMouseLeave={() => setHoveredLogout(false)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
            style={{ backgroundColor: hoveredLogout ? S.accent : "transparent", color: hoveredLogout ? S.expense : S.muted, border: "none", cursor: "pointer" }}
          >
            <LogOut className="h-4 w-4 shrink-0" style={{ color: hoveredLogout ? S.expense : S.muted }} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full shadow-sm transition-colors"
          style={{ border: `1px solid ${S.border}`, backgroundColor: S.bg, color: S.muted, cursor: "pointer" }}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>

      {/* ── Main ── */}
      <main className={cn("flex-1 transition-all duration-300", collapsed ? "ml-[68px]" : "ml-[220px]")}>

        {/* Topbar — left: toast | right: theme + notif */}
        <div style={{ position: "sticky", top: 0, zIndex: 20, display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1.5rem", background: "hsl(var(--topbar-bg))", borderBottom: "1px solid hsl(var(--topbar-border))", transition: "background 0.2s ease" }}>

          {/* Left side — expiry toast pill */}
          <div style={{ display: "flex", alignItems: "center", minWidth: 0, overflow: "hidden" }}>
            {toastVisible && expiresAt && (
              <PwExpiryToast
                expiresAt={expiresAt}
                onDismiss={handleToastDismiss}
                onGoToSettings={handleGoToSettings}
              />
            )}
          </div>

          {/* Right side — theme toggle + notifications */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
            <button onClick={toggleTheme} className="ts-theme-btn" title={isDark ? "Switch to light mode" : "Switch to dark mode"} aria-label="Toggle theme">
              {isDark ? <Sun style={{ width: "0.9rem", height: "0.9rem" }} /> : <Moon style={{ width: "0.9rem", height: "0.9rem" }} />}
            </button>
            <NotificationPanel isAdmin={isAdmin} authHeader={authHeader} onDeepLink={handleDeepLink} />
          </div>
        </div>

        {/* Page content */}
        <div className="p-6 lg:p-8 ts-page-bg" style={{ minHeight: "calc(100vh - 57px)" }}>
          {isDeactivated ? (
            <SettingsPage />
          ) : (
            <>
              {selectedMenu === "dashboard"        && <DashboardOverview userRole={userRole} userId={userID} />}
              {selectedMenu === "transactions"     && <Transactions />}
              {selectedMenu === "reports"          && <Reports />}
              {selectedMenu === "manageCategories" && isAdmin && <ManageCategories onClose={() => setSelectedMenu("dashboard")} />}
              {selectedMenu === "manageUsers"      && isAdmin && <ManageUsers />}
              {selectedMenu === "settings"         && <SettingsPage />}
            </>
          )}
        </div>
      </main>

      {/* ── Logout confirm modal ── */}
      {showLogoutConfirm && (
        <div onClick={() => setShowLogoutConfirm(false)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1rem" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "hsl(220,20%,12%)", border: "1px solid hsl(220,20%,20%)", borderRadius: "0.875rem", padding: "1.75rem", width: "100%", maxWidth: "360px", boxShadow: "0 24px 48px rgba(0,0,0,0.55)", textAlign: "center" }}>
            <div style={{ width: "2.75rem", height: "2.75rem", borderRadius: "50%", backgroundColor: "hsl(0 72% 51% / 0.12)", border: "1px solid hsl(0 72% 51% / 0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
              <LogOut style={{ width: "1.2rem", height: "1.2rem", color: S.expense }} />
            </div>
            <h2 style={{ color: "hsl(220,14%,90%)", fontSize: "0.95rem", fontWeight: 700, margin: "0 0 0.4rem" }}>Log out?</h2>
            <p style={{ color: "hsl(220,10%,55%)", fontSize: "0.78rem", margin: "0 0 1.5rem", lineHeight: 1.5 }}>Are you sure you want to log out?</p>
            <div style={{ display: "flex", gap: "0.65rem" }}>
              <button onClick={() => setShowLogoutConfirm(false)}
                style={{ flex: 1, padding: "0.6rem", borderRadius: "0.5rem", fontSize: "0.82rem", fontWeight: 600, border: "1px solid hsl(199 89% 48% / 0.4)", background: "hsl(199 89% 48% / 0.1)", color: S.primary, cursor: "pointer", transition: "opacity 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
                Cancel
              </button>
              <button onClick={() => { setShowLogoutConfirm(false); logout(); }}
                style={{ flex: 1, padding: "0.6rem", borderRadius: "0.5rem", fontSize: "0.82rem", fontWeight: 700, border: "1px solid hsl(0 72% 51% / 0.4)", background: "hsl(0 72% 51% / 0.12)", color: S.expense, cursor: "pointer", transition: "opacity 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Deep-link deletion modal ── */}
      {showDeletionModalDirect && (
        <HandleDeletionRequest
          initialRequestId={deepLinkRequestId}
          onClose={() => { setShowDeletionModalDirect(false); setDeepLinkRequestId(undefined); }}
        />
      )}
    </div>
  );
}