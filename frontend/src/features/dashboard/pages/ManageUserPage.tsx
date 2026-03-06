import { useState, useContext } from "react";
import { AuthContext } from "../../auth/AuthContext";
import { Users, Eye, ShieldCheck, Trash2, UserCircle } from "lucide-react";
import {
  ReadUsers,
  PromoteUser,
  UserDetails,
  HandleDeletionRequest
} from "../components/modals";

// ── Same tokens as TransactionPage / DashboardOverview ────────────────────────
const C = {
  primary:  "hsl(199,89%,38%)",
  income:   "hsl(160,60%,45%)",
  expense:  "hsl(0,72%,51%)",
  warning:  "hsl(45,85%,50%)",
  purple:   "hsl(280,60%,55%)",
  surface:  "hsl(220,14%,96%)",
  border:   "hsl(220,13%,89%)",
  fg:       "hsl(220,14%,15%)",
  fgLight:  "hsl(220,10%,46%)",
};

interface ActionCard {
  label:       string;
  description: string;
  icon:        typeof Eye;
  color:       string;
  bgColor:     string;
  onClick:     () => void;
}

export default function ManageUsersPage() {
  const { user } = useContext(AuthContext);
  const userRole = user!.role_id;
  const userID   = user!.id;

  const isSuperAdmin = userID === 1 && userRole === 1;
  const isAdmin      = userRole === 1 || userRole === 2;

  const [showReadModal,          setShowReadModal]          = useState(false);
  const [showPromoteModal,       setShowPromoteModal]       = useState(false);
  const [showDetailsModal,       setShowDetailsModal]       = useState(false);
  const [showHandleRequestModal, setShowHandleRequestModal] = useState(false);
  const [hoveredCard,            setHoveredCard]            = useState<number | null>(null);

  // Build action list conditionally — same pattern as TransactionPage
  const actions: ActionCard[] = [
    {
      label:       "View Users",
      description: "Browse all registered user accounts",
      icon:        Eye,
      color:       C.primary,
      bgColor:     "hsl(199 89% 38% / 0.08)",
      onClick:     () => setShowReadModal(true),
    },
    // Super Admin only
    ...(isSuperAdmin ? [{
      label:       "Promote / Demote User",
      description: "Change a user's role or access level",
      icon:        ShieldCheck,
      color:       C.income,
      bgColor:     "hsl(160 60% 45% / 0.08)",
      onClick:     () => setShowPromoteModal(true),
    }] : []),
    // Admin + Super Admin
    ...(isAdmin ? [{
      label:       "Handle Deletion Requests",
      description: "Review and approve transaction deletion requests",
      icon:        Trash2,
      color:       C.expense,
      bgColor:     "hsl(0 72% 51% / 0.08)",
      onClick:     () => setShowHandleRequestModal(true),
    }] : []),
    {
      label:       "View User Details",
      description: "Inspect profile and account information",
      icon:        UserCircle,
      color:       C.purple,
      bgColor:     "hsl(280 60% 55% / 0.08)",
      onClick:     () => setShowDetailsModal(true),
    },
  ];

  return (
    <>
      <title>Manage Users</title>

      <div className="space-y-6">
        {/* Page header — mirrors TransactionPage */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" style={{ color: C.primary }} />
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: C.fg }}>
              Manage Users
            </h1>
          </div>
          <p className="text-sm" style={{ color: C.fgLight }}>
            {isSuperAdmin
              ? "Super admin controls — users, roles, and deletion requests"
              : isAdmin
              ? "Manage users and handle deletion requests"
              : "View users and your account details"}
          </p>
        </div>

        {/* Action cards grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((action, idx) => {
            const Icon    = action.icon;
            const hovered = hoveredCard === idx;
            return (
              <button
                key={idx}
                onClick={action.onClick}
                onMouseEnter={() => setHoveredCard(idx)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  background:    "hsl(0,0%,100%)",
                  border:        `1px solid ${hovered ? action.color : C.border}`,
                  borderRadius:  "0.75rem",
                  padding:       "1.25rem 1.5rem",
                  cursor:        "pointer",
                  textAlign:     "left",
                  transition:    "border-color 0.15s, box-shadow 0.15s, transform 0.12s",
                  boxShadow:     hovered
                    ? `0 4px 16px hsl(0 0% 0% / 0.08), 0 0 0 3px ${action.color}1a`
                    : "0 1px 3px hsl(0 0% 0% / 0.06)",
                  transform:     hovered ? "translateY(-2px)" : "none",
                  display:       "flex",
                  flexDirection: "column",
                  gap:           "0.75rem",
                }}
              >
                {/* Icon badge */}
                <div style={{
                  width:           "2.5rem",
                  height:          "2.5rem",
                  borderRadius:    "0.5rem",
                  backgroundColor: hovered ? action.color : action.bgColor,
                  display:         "flex",
                  alignItems:      "center",
                  justifyContent:  "center",
                  transition:      "background-color 0.15s",
                  flexShrink:      0,
                }}>
                  <Icon style={{
                    width:      "1.1rem",
                    height:     "1.1rem",
                    color:      hovered ? "hsl(0,0%,100%)" : action.color,
                    transition: "color 0.15s",
                  }} />
                </div>

                {/* Text */}
                <div>
                  <p className="text-sm font-semibold" style={{ color: C.fg, marginBottom: "0.2rem" }}>
                    {action.label}
                  </p>
                  <p className="text-xs" style={{ color: C.fgLight, lineHeight: "1.4" }}>
                    {action.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      {showReadModal          && <ReadUsers           onClose={() => setShowReadModal(false)}          />}
      {showPromoteModal       && <PromoteUser          onClose={() => setShowPromoteModal(false)}       />}
      {showHandleRequestModal && <HandleDeletionRequest onClose={() => setShowHandleRequestModal(false)} />}
      {showDetailsModal       && <UserDetails          onClose={() => setShowDetailsModal(false)}       />}
    </>
  );
}