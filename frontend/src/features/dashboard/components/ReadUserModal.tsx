// ReadUserModal.tsx
import { useEffect, useState, useContext } from "react";
import api from "../../../services/apiClient";
import { AuthContext } from "../../auth/AuthContext";

import type { OnCloseProps } from "../../../../utility";
import { useOutsideClickStrict } from "../../../../utilityHooks";
import type { ReadUserWithCount, ViewMode } from "../schemas/user";

export default function ReadUserModal({ onClose }: OnCloseProps) {
  const { user } = useContext(AuthContext);

  const { handleMouseDown, handleMouseUp } = useOutsideClickStrict(onClose);

  const token = localStorage.getItem("access_token");
  const tokenType = localStorage.getItem("token_type");

  const [users, setUsers] = useState<ReadUserWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("all");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        if (!token || !tokenType) return;
        if (!user) return;

        const res = await api.get("api/users/", {
          headers: { Authorization: `${tokenType} ${token}` },
        });

        setUsers(res.data);
      } catch (err) {
        console.error("Failed to fetch users");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [token, tokenType]);

  const getRoleName = (roleId: number) => {
    return roleId === 1 ? "Admin" : "Standard";
  };

  const filteredUsers = users.filter((u) => {
    if (viewMode === "all") return true;
    if (viewMode === "admin") return u.role_id === 1;
    if (viewMode === "standard") return u.role_id === 2;
    return true;
  });

  return (
    <div
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      style={overlayStyle}
    >
      <div onClick={(e) => e.stopPropagation()} style={modalStyle}>
        <button onClick={onClose} style={closeStyle}>
          ×
        </button>

        <h2 style={{ textAlign: "center" }}>View Users</h2>

        <div style={{ margin: "0.5rem 0" }}>
          <label style={{ marginRight: "0.5rem" }}>Filter:</label>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as ViewMode)}
          >
            <option value="all">All Users</option>
            <option value="admin">Admins Only</option>
            <option value="standard">Standard Users Only</option>
          </select>
        </div>

        {loading && <p>Loading...</p>}

        {!loading && filteredUsers.length === 0 && <p>No users found.</p>}

        {!loading && filteredUsers.length > 0 && (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Full Name</th>
                <th style={thStyle}>Phone</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Active</th>
                <th style={thStyle}>Transaction Count</th>
                <th style={thStyle}>Created At</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id}>
                  <td style={tdStyle}>{u.id}</td>
                  <td style={tdStyle}>{u.email}</td>
                  <td style={tdStyle}>
                    {u.first_name} {u.middle_name ? u.middle_name + " " : ""}
                    {u.last_name}
                  </td>
                  <td style={tdStyle}>{u.phone_number || "-"}</td>
                  <td style={tdStyle}>{getRoleName(u.role_id)}</td>
                  <td style={tdStyle}>{u.is_active ? "Yes" : "No"}</td>
                  <td style={tdStyle}>{u.transaction_count ?? 0}</td>
                  <td style={tdStyle}>
                    {new Date(u.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
  minWidth: "900px",
  maxHeight: "80vh",
  overflow: "auto",
  position: "relative",
};

const closeStyle: React.CSSProperties = {
  position: "absolute",
  top: "8px",
  right: "12px",
  background: "transparent",
  border: "none",
  color: "#aaa",
  fontSize: "22px",
  fontWeight: "bold",
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