import { useState, useContext } from "react";
import { AuthContext } from "../../auth/AuthContext";
import { Users, Eye, ShieldCheck, Trash2, UserCircle, Receipt } from "lucide-react";
import {
  ReadUsers,
  PromoteUser,
  UserDetails,
  HandleDeletionRequest,
  UserTransactions,   // ← add this export to your modals/index.ts
} from "../components/modals";
import { ActionButton } from "../components/overview/ActionCard";
import type { ActionCard } from "../components/overview/ActionCard";

const C = {
  primary: "hsl(var(--primary))",
  income:  "hsl(var(--income))",
  expense: "hsl(var(--expense))",
  purple:  "hsl(280,60%,55%)",
  teal:    "hsl(174,60%,45%)",
};

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
  const [showUserTxModal,        setShowUserTxModal]        = useState(false);
  const [hoveredCard,            setHoveredCard]            = useState<string | null>(null);

  const actions: ActionCard[] = [
    {
      label:       "View Users",
      description: "Browse all registered user accounts",
      icon:        Eye,
      color:       C.primary,
      bgColor:     "hsl(var(--primary) / 0.08)",
      onClick:     () => setShowReadModal(true),
    },
    {
      label:       isSuperAdmin ? "Manage User Details" : "View User Details",
      description: isSuperAdmin
        ? "Inspect profiles and manage account status"
        : "Inspect profile and account information",
      icon:        UserCircle,
      color:       C.purple,
      bgColor:     "hsl(280 60% 55% / 0.08)",
      onClick:     () => setShowDetailsModal(true),
    },
    ...(isAdmin ? [{
      label:       "User Transactions",
      description: "View all transactions for a specific user",
      icon:        Receipt,
      color:       C.teal,
      bgColor:     "hsl(174 60% 45% / 0.08)",
      onClick:     () => setShowUserTxModal(true),
    }] : []),
    ...(isSuperAdmin ? [{
      label:       "Promote / Demote User",
      description: "Change a user's role or access level",
      icon:        ShieldCheck,
      color:       C.income,
      bgColor:     "hsl(var(--income) / 0.08)",
      onClick:     () => setShowPromoteModal(true),
    }] : []),
    ...(isAdmin ? [{
      label:       "Handle Deletion Requests",
      description: "Review and approve transaction deletion requests",
      icon:        Trash2,
      color:       C.expense,
      bgColor:     "hsl(var(--expense) / 0.08)",
      onClick:     () => setShowHandleRequestModal(true),
    }] : []),
  ];

  return (
    <>
      <title>Manage Users</title>
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" style={{ color: C.primary }} />
            <h1 className="text-2xl font-bold tracking-tight ts-page-fg">Manage Users</h1>
          </div>
          <p className="text-sm ts-page-fg-light">
            {isSuperAdmin
              ? "Super admin controls — users, roles, and deletion requests"
              : isAdmin
              ? "Manage users and handle deletion requests"
              : "View users and your account details"}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((action, idx) => (
            <ActionButton
              key={idx}
              id={`action-${idx}`}
              action={action}
              hoveredCard={hoveredCard}
              setHoveredCard={setHoveredCard}
            />
          ))}
        </div>
      </div>

      {showReadModal          && <ReadUsers              onClose={() => setShowReadModal(false)}          />}
      {showPromoteModal       && <PromoteUser            onClose={() => setShowPromoteModal(false)}       />}
      {showHandleRequestModal && <HandleDeletionRequest  onClose={() => setShowHandleRequestModal(false)} />}
      {showDetailsModal       && <UserDetails            onClose={() => setShowDetailsModal(false)}       />}
      {showUserTxModal        && <UserTransactions  onClose={() => setShowUserTxModal(false)}        />}
    </>
  );
}