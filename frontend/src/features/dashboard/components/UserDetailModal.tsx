import { useState, useEffect, useContext } from "react";
import api from "../../../services/apiClient";
import { AuthContext } from "../../auth/AuthContext";
import type { ReadUserWithCount, ViewMode } from "../schemas/user";
import { useOutsideClickStrict } from "../../../../utilityHooks";
import type { OnCloseProps } from "../../../../utility";

export default function UserDetailsModal({ onClose }: OnCloseProps) {
  const { user: currentUser } = useContext(AuthContext);
  const { handleMouseDown, handleMouseUp } = useOutsideClickStrict(onClose);

  const token = localStorage.getItem("access_token");
  const tokenType = localStorage.getItem("token_type");

  const isSuperAdmin = currentUser?.id === 1 && currentUser?.role_id === 1;

  const [users, setUsers] = useState<ReadUserWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<ReadUserWithCount | null>(null);
  const [viewMode] = useState<ViewMode>("all");

  const [showConfirm, setShowConfirm] = useState(false);
  const [actionType, setActionType] = useState<"delete" | "restore" | null>(null);
  const [deleteCountdown, setDeleteCountdown] = useState<number>(5);
  const [countdownActive, setCountdownActive] = useState(false);

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
    if (viewMode === "all") return true;
    if (viewMode === "admin") return u.role_id === 1;
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
        prev.map((u) =>
          u.id === selectedUser.id ? { ...u, is_active: false } : u
        )
      );

      setSelectedUser((prev) =>
        prev ? { ...prev, is_active: false } : prev
      );

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
        prev.map((u) =>
          u.id === selectedUser.id ? { ...u, is_active: true } : u
        )
      );

      setSelectedUser((prev) =>
        prev ? { ...prev, is_active: true } : prev
      );

      setShowConfirm(false);
    } catch (err) {
      console.error("Restore failed", err);
    }
  };

  return (
    <div onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} style={overlayStyle}>
      <div onClick={(e) => e.stopPropagation()} style={modalStyle}>
        <button onClick={onClose} style={closeStyle}>×</button>
        <h2 style={{ textAlign: "center" }}>User Details</h2>

        {loading && <p>Loading...</p>}

        {!loading && !selectedUser && filteredUsers.length > 0 && (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Full Name</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Active</th>
                <th style={thStyle}>Transaction Count</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr
                  key={u.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedUser(u)}
                >
                  <td style={tdStyle}>{u.id}</td>
                  <td style={tdStyle}>{u.email}</td>
                  <td style={tdStyle}>{fullName(u)}</td>
                  <td style={tdStyle}>{getRoleName(u)}</td>
                  <td style={tdStyle}>{u.is_active ? "Yes" : "No"}</td>
                  <td style={tdStyle}>{u.transaction_count ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && selectedUser && (
          <>
            <h3>Basic Information</h3>
            <p><strong>ID:</strong> {selectedUser.id}</p>
            <p><strong>Email:</strong> {selectedUser.email}</p>
            <p><strong>Full Name:</strong> {fullName(selectedUser)}</p>
            <p><strong>Phone:</strong> {selectedUser.phone_number || "-"}</p>
            <p><strong>Role:</strong> {getRoleName(selectedUser)}</p>
            <p><strong>Account Status:</strong> {selectedUser.is_active ? "Active" : "Inactive"}</p>
            <p><strong>Created At:</strong> {new Date(selectedUser.created_at).toLocaleString()}</p>

            <hr />

            <h3>Activity</h3>
            <p><strong>Transaction Count:</strong> {selectedUser.transaction_count ?? 0}</p>

            <button onClick={() => setSelectedUser(null)} style={{ marginBottom: "1rem" }}>
              ← Back to Users List
            </button>

            {/* ACTION BUTTON */}
            {isSuperAdmin && selectedUser.id !== 1 && (
              <button
                onClick={() => handleOpenAction(selectedUser)}
                style={selectedUser.is_active ? superAdminButtonStyleRed : superAdminButtonStyleGreen}
              >
                {selectedUser.is_active ? "Soft Delete Account" : "Restore Account"}
              </button>
            )}

            {/* CONFIRM MODAL */}
            {showConfirm && selectedUser && (
              <div
                onClick={() => setShowConfirm(false)}
                style={confirmOverlayStyle}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={confirmModalStyle}
                >
                  <h2 style={{ textAlign: "center" }}>
                    {actionType === "delete" ? "Confirm Soft Delete" : "Confirm Restore"}
                  </h2>

                  <p style={{ color: actionType === "delete" ? "red" : "white" }}>
                    {actionType === "delete"
                      ? `WARNING: This account has ${selectedUser.transaction_count ?? 0} transactions.\nAre you sure you want to soft delete it?`
                      : `Are you sure you want to restore this deleted account with ${selectedUser.transaction_count ?? 0} transactions?`}
                  </p>

                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem" }}>
                    <button onClick={() => setShowConfirm(false)}>Cancel</button>

                    {actionType === "delete" && (
                      <button
                        onClick={handleSoftDelete}
                        disabled={countdownActive}
                        style={{
                          ...superAdminButtonStyleRed,
                          opacity: countdownActive ? 0.6 : 1,
                          cursor: countdownActive ? "not-allowed" : "pointer",
                        }}
                      >
                        {countdownActive ? `${deleteCountdown}...` : "Confirm Delete"}
                      </button>
                    )}

                    {actionType === "restore" && (
                      <button
                        onClick={handleRestore}
                        style={{
                          ...superAdminButtonStyleGreen,
                        }}
                      >
                        Confirm Restore
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------ STYLES ------------------ */
const overlayStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  backgroundColor: "rgba(0,0,0,0.3)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const modalStyle: React.CSSProperties = {
  background: "#1c1414",
  padding: "1.5rem",
  borderRadius: "8px",
  minWidth: "700px",
  maxHeight: "80vh",
  overflow: "auto",
  position: "relative",
  color: "#eee",
};

const confirmOverlayStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  backgroundColor: "rgba(0,0,0,0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const confirmModalStyle: React.CSSProperties = {
  background: "#1c1414",
  padding: "1.5rem",
  borderRadius: "8px",
  minWidth: "320px",
  color: "#fff",
};

const closeStyle: React.CSSProperties = {
  position: "absolute",
  top: "8px",
  right: "12px",
  background: "transparent",
  border: "none",
  color: "#aaa",
  fontSize: "22px",
  cursor: "pointer",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: "1rem",
  textAlign: "left",
};

const thStyle: React.CSSProperties = {
  border: "1px solid #999",
  padding: "4px 8px",
  backgroundColor: "#333",
  color: "#fff",
};

const tdStyle: React.CSSProperties = {
  border: "1px solid #999",
  padding: "4px 8px",
  color: "#eee",
};

const superAdminButtonStyleRed: React.CSSProperties = {
  backgroundColor: "#c0392b",
  color: "#fff",
  border: "none",
  padding: "0.5rem 1rem",
  cursor: "pointer",
};

const superAdminButtonStyleGreen: React.CSSProperties = {
  backgroundColor: "#27ae60",
  color: "#fff",
  border: "none",
  padding: "0.5rem 1rem",
  cursor: "pointer",
};