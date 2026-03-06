import { useState, useEffect, useContext } from "react";
import { X, UserCircle, ArrowLeft, Trash2, RotateCcw, AlertTriangle } from "lucide-react";
import api from "../../../../services/apiClient";
import { AuthContext } from "../../../auth/AuthContext";
import type { ReadUserWithCount, ViewMode } from "../../schemas/user";
import { useOutsideClickStrict } from "../../lib/utilityHooks";
import type { OnCloseProps } from "../../lib/utility";

// ── Design tokens (mirrors ReadUserModal) ─────────────────────────────────────
const C = {
  primary:    "hsl(199,89%,38%)",
  income:     "hsl(160,60%,45%)",
  expense:    "hsl(0,72%,51%)",
  warning:    "hsl(45,85%,50%)",
  surface:    "hsl(220,20%,12%)",
  surfaceEl:  "hsl(220,18%,16%)",
  surfaceHov: "hsl(220,16%,20%)",
  border:     "hsl(220,16%,22%)",
  fg:         "hsl(220,14%,90%)",
  fgMuted:    "hsl(220,10%,55%)",
  overlay:    "rgba(0,0,0,0.55)",
};

// ── Shared TD style ───────────────────────────────────────────────────────────
const td: React.CSSProperties = {
  padding:      "0.55rem 0.75rem",
  color:        "hsl(220,14%,85%)",
  borderBottom: "1px solid hsl(220,16%,18%)",
  overflow:     "hidden",
  textOverflow: "ellipsis",
  whiteSpace:   "nowrap",
};

// ── Shell (identical to ReadUserModal) ────────────────────────────────────────
function Shell({ children, onBackdropDown, onBackdropUp }: {
  children:       React.ReactNode;
  onBackdropDown: React.MouseEventHandler;
  onBackdropUp:   React.MouseEventHandler;
}) {
  return (
    <div
      onMouseDown={onBackdropDown}
      onMouseUp={onBackdropUp}
      style={{
        position:        "fixed",
        inset:           0,
        backgroundColor: C.overlay,
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        zIndex:          50,
        padding:         "1rem",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        onMouseUp={e => e.stopPropagation()}
        style={{
          background:    C.surface,
          border:        `1px solid ${C.border}`,
          borderRadius:  "1rem",
          width:         "100%",
          maxWidth:      "1100px",
          display:       "flex",
          flexDirection: "column",
          maxHeight:     "90vh",
          boxShadow:     "0 24px 48px rgba(0,0,0,0.5)",
          overflow:      "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Detail row ────────────────────────────────────────────────────────────────
function DetailRow({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <div style={{
      display:       "flex",
      alignItems:    "flex-start",
      gap:           "0.5rem",
      padding:       "0.65rem 0",
      borderBottom:  `1px solid ${C.border}`,
    }}>
      <span style={{
        fontSize:   "0.72rem",
        fontWeight: 600,
        color:      C.fgMuted,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        minWidth:   "130px",
        paddingTop: "0.05rem",
      }}>
        {label}
      </span>
      <span style={{ fontSize: "0.82rem", color: accent ?? C.fg, fontWeight: accent ? 600 : 400 }}>
        {value}
      </span>
    </div>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize:      "0.68rem",
      fontWeight:    700,
      color:         C.fgMuted,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      margin:        "1.25rem 0 0.25rem",
    }}>
      {children}
    </p>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function UserDetailsModal({ onClose }: OnCloseProps) {
  const { user: currentUser } = useContext(AuthContext);
  const { handleMouseDown, handleMouseUp } = useOutsideClickStrict(onClose);
  const token     = localStorage.getItem("access_token");
  const tokenType = localStorage.getItem("token_type");

  const isSuperAdmin = currentUser?.id === 1 && currentUser?.role_id === 1;

  const [users,           setUsers]           = useState<ReadUserWithCount[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [selectedUser,    setSelectedUser]    = useState<ReadUserWithCount | null>(null);
  const [viewMode]                            = useState<ViewMode>("all");
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [actionType,      setActionType]      = useState<"delete" | "restore" | null>(null);
  const [deleteCountdown, setDeleteCountdown] = useState<number>(5);
  const [countdownActive, setCountdownActive] = useState(false);
  const [hoveredRow,      setHoveredRow]      = useState<number | null>(null);

  /* ---------------- ROLE LOGIC ---------------- */
  const getRoleName = (u: ReadUserWithCount) => {
    if (u.id === 1) return "SUPER ADMIN";
    return u.role_id === 1 ? "Admin" : "Standard";
  };

  /* ---------------- FETCH USERS ---------------- */
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        if (!token || !tokenType || !currentUser) return;
        const res = await api.get("api/users/", {
          headers: { Authorization: `${tokenType} ${token}` },
        });
        setUsers(res.data);
      } catch (err) {
        console.error("Failed to fetch users", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [token, tokenType, currentUser]);

  /* ---------------- FILTER ---------------- */
  const filteredUsers = users.filter((u) => {
    if (viewMode === "all")      return true;
    if (viewMode === "admin")    return u.role_id === 1;
    if (viewMode === "standard") return u.role_id === 2;
    return true;
  });

  const fullName = (u: ReadUserWithCount) =>
    [u.first_name, u.middle_name, u.last_name].filter(Boolean).join(" ");

  /* ---------------- DELETE / RESTORE HANDLING ---------------- */
  const handleOpenAction = (u: ReadUserWithCount) => {
    if (!isSuperAdmin || u.id === 1) return;
    setSelectedUser(u);
    if (u.is_active) {
      setActionType("delete");
      setDeleteCountdown(5);
      setCountdownActive(true);
    } else {
      setActionType("restore");
    }
    setShowConfirm(true);
  };

  /* Countdown Effect for Delete */
  useEffect(() => {
    if (!countdownActive || actionType !== "delete") return;
    if (deleteCountdown <= 0) {
      setCountdownActive(false);
      return;
    }
    const timer = setTimeout(() => {
      setDeleteCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [deleteCountdown, countdownActive, actionType]);

  const handleSoftDelete = async () => {
    if (!selectedUser || selectedUser.id === 1) return;
    try {
      await api.delete(`api/users/${selectedUser.id}/soft`, {
        headers: { Authorization: `${tokenType} ${token}` },
      });
      setUsers((prev) =>
        prev.map((u) => u.id === selectedUser.id ? { ...u, is_active: false } : u)
      );
      setSelectedUser((prev) => prev ? { ...prev, is_active: false } : prev);
      setShowConfirm(false);
    } catch (err) {
      console.error("Soft delete failed", err);
    }
  };

  const handleRestore = async () => {
    if (!selectedUser) return;
    try {
      await api.put(`api/users/${selectedUser.id}/restore`, null, {
        headers: { Authorization: `${tokenType} ${token}` },
      });
      setUsers((prev) =>
        prev.map((u) => u.id === selectedUser.id ? { ...u, is_active: true } : u)
      );
      setSelectedUser((prev) => prev ? { ...prev, is_active: true } : prev);
      setShowConfirm(false);
    } catch (err) {
      console.error("Restore failed", err);
    }
  };

  // ── Derived display helpers ────────────────────────────────────────────────
  const adminCount    = users.filter(u => u.role_id === 1).length;
  const standardCount = users.filter(u => u.role_id === 2).length;
  const activeCount   = users.filter(u => u.is_active).length;

  // ── Role badge ─────────────────────────────────────────────────────────────
  const RoleBadge = ({ u }: { u: ReadUserWithCount }) => {
    const isSA    = u.id === 1;
    const isAdm   = u.role_id === 1;
    const color   = isSA ? C.warning : isAdm ? C.income : C.primary;
    const bgColor = isSA
      ? "hsl(45 85% 50% / 0.12)"
      : isAdm
      ? "hsl(160 60% 45% / 0.12)"
      : "hsl(199 89% 38% / 0.12)";
    return (
      <span style={{
        display:         "inline-block",
        padding:         "0.15rem 0.55rem",
        borderRadius:    "999px",
        fontSize:        "0.68rem",
        fontWeight:      700,
        backgroundColor: bgColor,
        color,
        border:          `1px solid ${color}40`,
      }}>
        {getRoleName(u)}
      </span>
    );
  };

  // ── Active badge ───────────────────────────────────────────────────────────
  const ActiveBadge = ({ active }: { active: boolean }) => (
    <span style={{
      display:         "inline-block",
      padding:         "0.15rem 0.5rem",
      borderRadius:    "999px",
      fontSize:        "0.68rem",
      fontWeight:      600,
      backgroundColor: active ? "hsl(160 60% 45% / 0.12)" : "hsl(220 10% 46% / 0.12)",
      color:           active ? C.income : C.fgMuted,
      border:          `1px solid ${active ? C.income : C.fgMuted}40`,
    }}>
      {active ? "Active" : "Inactive"}
    </span>
  );

  return (
    <Shell onBackdropDown={handleMouseDown} onBackdropUp={handleMouseUp}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        padding:        "1.25rem 1.5rem",
        borderBottom:   `1px solid ${C.border}`,
        flexShrink:     0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {selectedUser && (
            <button
              onClick={() => setSelectedUser(null)}
              style={{
                background:   C.surfaceEl,
                border:       `1px solid ${C.border}`,
                borderRadius: "0.5rem",
                color:        C.fgMuted,
                cursor:       "pointer",
                padding:      "0.3rem 0.6rem",
                display:      "flex",
                alignItems:   "center",
                gap:          "0.3rem",
                fontSize:     "0.75rem",
                transition:   "border-color 0.15s, color 0.15s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = C.primary;
                (e.currentTarget as HTMLButtonElement).style.color = C.primary;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;
                (e.currentTarget as HTMLButtonElement).style.color = C.fgMuted;
              }}
            >
              <ArrowLeft style={{ width: "0.75rem", height: "0.75rem" }} />
              Back
            </button>
          )}
          <div>
            <h2 style={{ color: C.fg, fontSize: "1.125rem", fontWeight: 700, margin: 0 }}>
              {selectedUser ? "User Details" : "View User Details"}
            </h2>
            <p style={{ color: C.fgMuted, fontSize: "0.75rem", margin: "0.2rem 0 0" }}>
              {selectedUser
                ? fullName(selectedUser) || selectedUser.email
                : `${filteredUsers.length} user${filteredUsers.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background:   "transparent",
            border:       `1px solid ${C.border}`,
            borderRadius: "0.5rem",
            color:        C.fgMuted,
            cursor:       "pointer",
            padding:      "0.3rem",
            display:      "flex",
            alignItems:   "center",
          }}
        >
          <X style={{ width: "1rem", height: "1rem" }} />
        </button>
      </div>

      {/* ── Summary pills (list view only) ───────────────────────────────────── */}
      {!loading && !selectedUser && users.length > 0 && (
        <div style={{
          display:      "flex",
          gap:          "0.75rem",
          padding:      "0.75rem 1.5rem",
          borderBottom: `1px solid ${C.border}`,
          flexShrink:   0,
        }}>
          {[
            { label: "Admins",   value: adminCount,    color: C.income  },
            { label: "Standard", value: standardCount, color: C.primary },
            { label: "Active",   value: activeCount,   color: "hsl(160,60%,45%)" },
          ].map(p => (
            <div key={p.label} style={{
              background:   `${p.color}18`,
              border:       `1px solid ${p.color}40`,
              borderRadius: "0.4rem",
              padding:      "0.3rem 0.75rem",
              fontSize:     "0.75rem",
            }}>
              <span style={{ color: C.fgMuted, marginRight: "0.4rem" }}>{p.label}</span>
              <span style={{ color: p.color, fontWeight: 700 }}>{p.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div style={{ overflowY: "auto", overflowX: "hidden", flex: 1 }}>

        {/* Loading */}
        {loading && (
          <p style={{ color: C.fgMuted, padding: "2rem", textAlign: "center" }}>Loading…</p>
        )}

        {/* ── User list table ───────────────────────────────────────────────── */}
        {!loading && !selectedUser && filteredUsers.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "5%"  }} />
              <col style={{ width: "28%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "12%" }} />
            </colgroup>
            <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
              <tr>
                {["ID", "Email", "Full Name", "Role", "Active", "Tx Count"].map(h => (
                  <th key={h} style={{
                    padding:       "0.6rem 0.75rem",
                    fontSize:      "0.7rem",
                    fontWeight:    600,
                    color:         C.fgMuted,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    borderBottom:  `1px solid ${C.border}`,
                    background:    C.surfaceEl,
                    textAlign:     "left",
                    whiteSpace:    "nowrap",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u, idx) => {
                const isEven   = idx % 2 === 0;
                const hovered  = hoveredRow === idx;
                return (
                  <tr
                    key={u.id}
                    style={{
                      backgroundColor: hovered
                        ? C.surfaceHov
                        : isEven ? "transparent" : "hsl(220,14%,14%)",
                      cursor:     "pointer",
                      transition: "background-color 0.1s",
                    }}
                    onClick={() => setSelectedUser(u)}
                    onMouseEnter={() => setHoveredRow(idx)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <td style={td}>{u.id}</td>
                    <td style={td}>{u.email}</td>
                    <td style={td}>{fullName(u)}</td>
                    <td style={td}><RoleBadge u={u} /></td>
                    <td style={td}><ActiveBadge active={u.is_active} /></td>
                    <td style={{ ...td, textAlign: "center" }}>{u.transaction_count ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* ── Detail view ──────────────────────────────────────────────────── */}
        {!loading && selectedUser && (
          <div style={{ padding: "1.5rem" }}>
            {/* Avatar row */}
            <div style={{
              display:      "flex",
              alignItems:   "center",
              gap:          "1rem",
              marginBottom: "0.5rem",
            }}>
              <div style={{
                width:           "3rem",
                height:          "3rem",
                borderRadius:    "50%",
                backgroundColor: C.surfaceEl,
                border:          `1px solid ${C.border}`,
                display:         "flex",
                alignItems:      "center",
                justifyContent:  "center",
                flexShrink:      0,
              }}>
                <UserCircle style={{ width: "1.6rem", height: "1.6rem", color: C.primary }} />
              </div>
              <div>
                <p style={{ color: C.fg, fontSize: "1rem", fontWeight: 700, margin: 0 }}>
                  {fullName(selectedUser) || "—"}
                </p>
                <p style={{ color: C.fgMuted, fontSize: "0.75rem", margin: "0.1rem 0 0" }}>
                  {selectedUser.email}
                </p>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <RoleBadge u={selectedUser} />
                <ActiveBadge active={selectedUser.is_active} />
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: "1px", background: C.border, margin: "1rem 0" }} />

            {/* Basic info */}
            <SectionHeading>Basic Information</SectionHeading>
            <DetailRow label="User ID"       value={selectedUser.id} />
            <DetailRow label="Email"         value={selectedUser.email} />
            <DetailRow label="Full Name"     value={fullName(selectedUser) || "—"} />
            <DetailRow label="Phone"         value={selectedUser.phone_number || "—"} />
            <DetailRow label="Role"          value={<RoleBadge u={selectedUser} />} />
            <DetailRow
              label="Account Status"
              value={<ActiveBadge active={selectedUser.is_active} />}
            />
            <DetailRow
              label="Created At"
              value={new Date(selectedUser.created_at).toLocaleString()}
              accent={C.fgMuted}
            />

            {/* Activity */}
            <SectionHeading>Activity</SectionHeading>
            <DetailRow
              label="Transaction Count"
              value={selectedUser.transaction_count ?? 0}
              accent={C.primary}
            />

            {/* Super Admin action */}
            {isSuperAdmin && selectedUser.id !== 1 && (
              <div style={{ marginTop: "1.5rem" }}>
                <button
                  onClick={() => handleOpenAction(selectedUser)}
                  style={{
                    display:      "flex",
                    alignItems:   "center",
                    gap:          "0.45rem",
                    padding:      "0.55rem 1.1rem",
                    borderRadius: "0.5rem",
                    fontSize:     "0.8rem",
                    fontWeight:   600,
                    cursor:       "pointer",
                    border:       "none",
                    transition:   "opacity 0.15s, transform 0.12s",
                    backgroundColor: selectedUser.is_active
                      ? "hsl(0 72% 51% / 0.15)"
                      : "hsl(160 60% 45% / 0.15)",
                    color:           selectedUser.is_active ? C.expense : C.income,
                    outline:         `1px solid ${selectedUser.is_active ? C.expense : C.income}40`,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                  onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                >
                  {selectedUser.is_active
                    ? <><Trash2   style={{ width: "0.85rem", height: "0.85rem" }} /> Soft Delete Account</>
                    : <><RotateCcw style={{ width: "0.85rem", height: "0.85rem" }} /> Restore Account</>
                  }
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Footer (list view) ─────────────────────────────────────────────── */}
      {!loading && !selectedUser && filteredUsers.length > 0 && (
        <div style={{
          padding:    "0.6rem 1.5rem",
          borderTop:  `1px solid ${C.border}`,
          fontSize:   "0.72rem",
          color:      C.fgMuted,
          flexShrink: 0,
        }}>
          Showing {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}
          {filteredUsers.length > 15 ? " · scroll to see more" : ""}
          {" · Click any row to view details"}
        </div>
      )}

      {/* ── Confirm overlay ────────────────────────────────────────────────── */}
      {showConfirm && selectedUser && (
        <div
          onClick={() => setShowConfirm(false)}
          style={{
            position:        "fixed",
            inset:           0,
            backgroundColor: "rgba(0,0,0,0.65)",
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
            zIndex:          100,
            padding:         "1rem",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background:    C.surface,
              border:        `1px solid ${actionType === "delete" ? C.expense + "60" : C.income + "60"}`,
              borderRadius:  "0.875rem",
              padding:       "1.75rem",
              width:         "100%",
              maxWidth:      "400px",
              boxShadow:     "0 24px 48px rgba(0,0,0,0.6)",
            }}
          >
            {/* Icon */}
            <div style={{
              width:           "2.75rem",
              height:          "2.75rem",
              borderRadius:    "50%",
              backgroundColor: actionType === "delete"
                ? "hsl(0 72% 51% / 0.15)"
                : "hsl(160 60% 45% / 0.15)",
              display:         "flex",
              alignItems:      "center",
              justifyContent:  "center",
              margin:          "0 auto 1rem",
            }}>
              {actionType === "delete"
                ? <AlertTriangle style={{ width: "1.3rem", height: "1.3rem", color: C.expense }} />
                : <RotateCcw     style={{ width: "1.3rem", height: "1.3rem", color: C.income }} />
              }
            </div>

            <h2 style={{
              color:      C.fg,
              fontSize:   "1rem",
              fontWeight: 700,
              textAlign:  "center",
              margin:     "0 0 0.5rem",
            }}>
              {actionType === "delete" ? "Confirm Soft Delete" : "Confirm Restore"}
            </h2>

            <p style={{
              color:      actionType === "delete" ? "hsl(0,72%,70%)" : C.fgMuted,
              fontSize:   "0.8rem",
              textAlign:  "center",
              lineHeight: "1.5",
              margin:     "0 0 1.5rem",
            }}>
              {actionType === "delete"
                ? `This account has ${selectedUser.transaction_count ?? 0} transaction${(selectedUser.transaction_count ?? 0) !== 1 ? "s" : ""}. Are you sure you want to soft delete it?`
                : `Restore this deleted account? It has ${selectedUser.transaction_count ?? 0} transaction${(selectedUser.transaction_count ?? 0) !== 1 ? "s" : ""}.`
              }
            </p>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  padding:      "0.5rem 1rem",
                  borderRadius: "0.5rem",
                  fontSize:     "0.8rem",
                  fontWeight:   600,
                  background:   C.surfaceEl,
                  border:       `1px solid ${C.border}`,
                  color:        C.fgMuted,
                  cursor:       "pointer",
                }}
              >
                Cancel
              </button>

              {actionType === "delete" && (
                <button
                  onClick={handleSoftDelete}
                  disabled={countdownActive}
                  style={{
                    display:         "flex",
                    alignItems:      "center",
                    gap:             "0.4rem",
                    padding:         "0.5rem 1rem",
                    borderRadius:    "0.5rem",
                    fontSize:        "0.8rem",
                    fontWeight:      600,
                    background:      countdownActive ? "hsl(0 72% 51% / 0.1)" : "hsl(0 72% 51% / 0.2)",
                    border:          `1px solid ${C.expense}${countdownActive ? "40" : "80"}`,
                    color:           countdownActive ? "hsl(0,72%,60%)" : C.expense,
                    cursor:          countdownActive ? "not-allowed" : "pointer",
                    transition:      "opacity 0.15s",
                    minWidth:        "130px",
                    justifyContent:  "center",
                  }}
                >
                  <Trash2 style={{ width: "0.8rem", height: "0.8rem" }} />
                  {countdownActive ? `Wait ${deleteCountdown}s…` : "Confirm Delete"}
                </button>
              )}

              {actionType === "restore" && (
                <button
                  onClick={handleRestore}
                  style={{
                    display:        "flex",
                    alignItems:     "center",
                    gap:            "0.4rem",
                    padding:        "0.5rem 1rem",
                    borderRadius:   "0.5rem",
                    fontSize:       "0.8rem",
                    fontWeight:     600,
                    background:     "hsl(160 60% 45% / 0.2)",
                    border:         `1px solid ${C.income}80`,
                    color:          C.income,
                    cursor:         "pointer",
                    justifyContent: "center",
                  }}
                >
                  <RotateCcw style={{ width: "0.8rem", height: "0.8rem" }} />
                  Confirm Restore
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}