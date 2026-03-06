// SettingsPage.tsx
import { useState, useContext } from "react";
import {
  User, Phone, Mail, Shield, Calendar, Edit3,
  Check, X, AlertTriangle, Trash2, Lock,
} from "lucide-react";
import api from "@/services/apiClient";
import { AuthContext } from "@/features/auth/AuthContext";

// ── Design tokens — matches DashboardPage sidebar + DashboardOverview ─────────
const C = {
  primary:    "hsl(199,89%,38%)",
  income:     "hsl(160,60%,45%)",
  expense:    "hsl(0,72%,51%)",
  warning:    "hsl(45,85%,50%)",
  surface:    "hsl(0,0%,100%)",
  surfaceSub: "hsl(220,14%,97%)",
  border:     "hsl(220,13%,89%)",
  fg:         "hsl(220,14%,15%)",
  fgLight:    "hsl(220,10%,46%)",
  fgMuted:    "hsl(220,10%,62%)",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(firstName?: string, lastName?: string): string {
  const f = firstName?.trim()[0] ?? "";
  const l = lastName?.trim()[0] ?? "";
  return (f + l).toUpperCase() || "?";
}

function getAvatarColor(id: number): string {
  const palette = [
    "hsl(199,89%,38%)", "hsl(160,60%,45%)", "hsl(280,60%,55%)",
    "hsl(30,90%,56%)",  "hsl(340,65%,55%)", "hsl(45,85%,50%)",
  ];
  return palette[id % palette.length];
}

function RoleBadge({ roleId, userId }: { roleId: number; userId: number }) {
  const isSA  = userId === 1 && roleId === 1;
  const isAdm = roleId === 1;
  const label = isSA ? "Super Admin" : isAdm ? "Admin" : "Standard User";
  const color = isSA
    ? C.warning
    : isAdm
    ? C.income
    : C.primary;
  return (
    <span style={{
      display:         "inline-flex",
      alignItems:      "center",
      gap:             "0.3rem",
      padding:         "0.2rem 0.6rem",
      borderRadius:    "999px",
      fontSize:        "0.7rem",
      fontWeight:      700,
      backgroundColor: `${color}18`,
      color,
      border:          `1px solid ${color}40`,
    }}>
      <Shield style={{ width: "0.65rem", height: "0.65rem" }} />
      {label}
    </span>
  );
}

// ── Read-only info row ────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value }: {
  icon:  typeof Mail;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div style={{
      display:       "flex",
      alignItems:    "center",
      gap:           "0.875rem",
      padding:       "0.75rem 1rem",
      borderRadius:  "0.5rem",
      background:    C.surfaceSub,
      border:        `1px solid ${C.border}`,
    }}>
      <div style={{
        width:           "2rem",
        height:          "2rem",
        borderRadius:    "0.375rem",
        backgroundColor: `${C.primary}12`,
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        flexShrink:      0,
      }}>
        <Icon style={{ width: "0.875rem", height: "0.875rem", color: C.primary }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: "0.68rem", color: C.fgMuted, margin: 0, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {label}
        </p>
        <p style={{ fontSize: "0.85rem", color: C.fg, margin: "0.1rem 0 0", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value}
        </p>
      </div>
    </div>
  );
}

// ── Editable field ────────────────────────────────────────────────────────────
function EditableField({
  label, value, onChange, placeholder, type = "text",
}: {
  label:       string;
  value:       string;
  onChange:    (v: string) => void;
  placeholder?: string;
  type?:        string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      <label style={{ fontSize: "0.72rem", fontWeight: 600, color: C.fgLight, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width:        "100%",
          padding:      "0.55rem 0.75rem",
          borderRadius: "0.45rem",
          border:       `1px solid ${C.border}`,
          fontSize:     "0.85rem",
          color:        C.fg,
          background:   C.surface,
          outline:      "none",
          transition:   "border-color 0.15s",
          boxSizing:    "border-box",
        }}
        onFocus={e => (e.target.style.borderColor = C.primary)}
        onBlur={e  => (e.target.style.borderColor = C.border)}
      />
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize:      "0.7rem",
      fontWeight:    700,
      color:         C.fgMuted,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      margin:        "0 0 0.75rem",
    }}>
      {children}
    </p>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, setUser } = useContext(AuthContext);

  const token     = localStorage.getItem("access_token");
  const tokenType = localStorage.getItem("token_type");

  type Tab = "profile" | "account";
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  // Edit form state
  const [isEditing,  setIsEditing]  = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [saveError,  setSaveError]  = useState<string | null>(null);
  const [saveSuccess,setSaveSuccess]= useState(false);

  const [firstName,  setFirstName]  = useState(user?.first_name   ?? "");
  const [middleName, setMiddleName] = useState(user?.middle_name  ?? "");
  const [lastName,   setLastName]   = useState(user?.last_name    ?? "");
  const [phone,      setPhone]      = useState(user?.phone_number ?? "");

  if (!user) return null;

  const fullName = [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(" ");
  const avatarColor = getAvatarColor(user.id);
  const initials    = getInitials(user.first_name, user.last_name);
  const isDeactivated = !user.is_active;

  const roleLabel =
    user.id === 1 && user.role_id === 1 ? "Super Admin"
    : user.role_id === 1               ? "Admin"
    :                                    "Standard User";

  // ── Reset form to current user values ──────────────────────────────────────
  const resetForm = () => {
    setFirstName(user.first_name   ?? "");
    setMiddleName(user.middle_name ?? "");
    setLastName(user.last_name     ?? "");
    setPhone(user.phone_number     ?? "");
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleCancelEdit = () => {
    resetForm();
    setIsEditing(false);
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!token || !tokenType) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const res = await api.patch(
        "api/users/me",
        {
          first_name:   firstName.trim()  || null,
          middle_name:  middleName.trim() || null,
          last_name:    lastName.trim()   || null,
          phone_number: phone.trim()      || null,
        },
        { headers: { Authorization: `${tokenType} ${token}` } }
      );
      // Update AuthContext so sidebar name reflects change immediately
      setUser({ ...user, ...res.data });
      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err?.response?.data?.detail ?? "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  // ── Tab button ──────────────────────────────────────────────────────────────
  const TabBtn = ({ tab, label }: { tab: Tab; label: string }) => {
    const active = activeTab === tab;
    return (
      <button
        onClick={() => setActiveTab(tab)}
        style={{
          padding:         "0.5rem 1.25rem",
          borderRadius:    "0.375rem",
          fontSize:        "0.82rem",
          fontWeight:      600,
          border:          "none",
          cursor:          "pointer",
          transition:      "background-color 0.15s, color 0.15s",
          backgroundColor: active ? C.surface : "transparent",
          color:           active ? C.fg      : C.fgLight,
          boxShadow:       active ? "0 1px 4px hsl(220 13% 80% / 0.6)" : "none",
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="space-y-6" style={{ maxWidth: "680px" }}>
      <title>Settings</title>

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: C.fg }}>
          Settings
        </h1>
        <p className="text-sm" style={{ color: C.fgLight }}>
          Manage your profile and account preferences
        </p>
      </div>

      {/* ── Deactivated banner ─────────────────────────────────────────────── */}
      {isDeactivated && (
        <div style={{
          display:       "flex",
          alignItems:    "flex-start",
          gap:           "0.75rem",
          padding:       "1rem 1.25rem",
          borderRadius:  "0.6rem",
          background:    "hsl(0 72% 51% / 0.07)",
          border:        `1px solid hsl(0 72% 51% / 0.3)`,
        }}>
          <AlertTriangle style={{ width: "1.1rem", height: "1.1rem", color: C.expense, flexShrink: 0, marginTop: "0.05rem" }} />
          <div>
            <p style={{ fontSize: "0.85rem", fontWeight: 700, color: C.expense, margin: 0 }}>
              Your account is deactivated
            </p>
            <p style={{ fontSize: "0.78rem", color: C.fgLight, margin: "0.25rem 0 0", lineHeight: 1.5 }}>
              You can only access Settings. To reactivate your account, please contact an administrator.
            </p>
          </div>
        </div>
      )}

      {/* ── Avatar + name card ─────────────────────────────────────────────── */}
      <div style={{
        display:       "flex",
        alignItems:    "center",
        gap:           "1.25rem",
        padding:       "1.25rem 1.5rem",
        borderRadius:  "0.75rem",
        background:    C.surface,
        border:        `1px solid ${C.border}`,
        boxShadow:     "0 1px 4px hsl(220 13% 80% / 0.3)",
      }}>
        {/* Initials avatar */}
        <div style={{
          width:           "3.5rem",
          height:          "3.5rem",
          borderRadius:    "50%",
          backgroundColor: avatarColor,
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          flexShrink:      0,
          fontWeight:      800,
          fontSize:        "1.1rem",
          color:           "hsl(0,0%,100%)",
          letterSpacing:   "-0.02em",
          boxShadow:       `0 0 0 3px ${avatarColor}30`,
        }}>
          {initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: "1rem", fontWeight: 700, color: C.fg, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {fullName || user.email}
          </p>
          <p style={{ fontSize: "0.78rem", color: C.fgLight, margin: "0.15rem 0 0.35rem" }}>
            {user.email}
          </p>
          <RoleBadge roleId={user.role_id} userId={user.id} />
        </div>
        {/* Active/Inactive pill */}
        <div style={{ marginLeft: "auto", flexShrink: 0 }}>
          <span style={{
            display:         "inline-block",
            padding:         "0.2rem 0.6rem",
            borderRadius:    "999px",
            fontSize:        "0.7rem",
            fontWeight:      600,
            backgroundColor: user.is_active ? "hsl(160 60% 45% / 0.12)" : "hsl(220 10% 46% / 0.12)",
            color:           user.is_active ? C.income : C.fgMuted,
            border:          `1px solid ${user.is_active ? C.income : C.fgMuted}40`,
          }}>
            {user.is_active ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      {/* ── Tab bar ────────────────────────────────────────────────────────── */}
      <div style={{
        display:         "inline-flex",
        gap:             "0.25rem",
        padding:         "0.25rem",
        borderRadius:    "0.5rem",
        backgroundColor: "hsl(220,14%,95%)",
      }}>
        <TabBtn tab="profile" label="Profile" />
        <TabBtn tab="account" label="Account" />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          PROFILE TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "profile" && (
        <div style={{
          background:   C.surface,
          border:       `1px solid ${C.border}`,
          borderRadius: "0.75rem",
          overflow:     "hidden",
          boxShadow:    "0 1px 4px hsl(220 13% 80% / 0.3)",
        }}>
          {/* Section header */}
          <div style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            padding:        "1rem 1.5rem",
            borderBottom:   `1px solid ${C.border}`,
          }}>
            <div>
              <p style={{ fontSize: "0.9rem", fontWeight: 700, color: C.fg, margin: 0 }}>
                Profile Information
              </p>
              <p style={{ fontSize: "0.75rem", color: C.fgLight, margin: "0.15rem 0 0" }}>
                Update your name and contact details
              </p>
            </div>
            {!isEditing ? (
              <button
                onClick={() => { resetForm(); setIsEditing(true); }}
                style={{
                  display:         "flex",
                  alignItems:      "center",
                  gap:             "0.4rem",
                  padding:         "0.45rem 0.9rem",
                  borderRadius:    "0.45rem",
                  fontSize:        "0.78rem",
                  fontWeight:      600,
                  border:          `1px solid ${C.border}`,
                  background:      C.surface,
                  color:           C.fg,
                  cursor:          "pointer",
                  transition:      "border-color 0.15s, color 0.15s",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = C.primary;
                  (e.currentTarget as HTMLButtonElement).style.color = C.primary;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;
                  (e.currentTarget as HTMLButtonElement).style.color = C.fg;
                }}
              >
                <Edit3 style={{ width: "0.8rem", height: "0.8rem" }} />
                Edit
              </button>
            ) : (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={handleCancelEdit}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.35rem",
                    padding: "0.45rem 0.9rem", borderRadius: "0.45rem",
                    fontSize: "0.78rem", fontWeight: 600,
                    border: `1px solid ${C.border}`, background: C.surface,
                    color: C.fgLight, cursor: "pointer",
                  }}
                >
                  <X style={{ width: "0.8rem", height: "0.8rem" }} />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    display:         "flex",
                    alignItems:      "center",
                    gap:             "0.35rem",
                    padding:         "0.45rem 0.9rem",
                    borderRadius:    "0.45rem",
                    fontSize:        "0.78rem",
                    fontWeight:      600,
                    border:          "none",
                    background:      saving ? `${C.primary}80` : C.primary,
                    color:           "hsl(0,0%,100%)",
                    cursor:          saving ? "not-allowed" : "pointer",
                    transition:      "opacity 0.15s",
                  }}
                >
                  <Check style={{ width: "0.8rem", height: "0.8rem" }} />
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            )}
          </div>

          <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            {/* Success / error banners */}
            {saveSuccess && (
              <div style={{
                display: "flex", alignItems: "center", gap: "0.6rem",
                padding: "0.65rem 1rem", borderRadius: "0.45rem",
                background: "hsl(160 60% 45% / 0.09)",
                border: `1px solid hsl(160 60% 45% / 0.3)`,
                fontSize: "0.8rem", color: C.income, fontWeight: 600,
              }}>
                <Check style={{ width: "0.85rem", height: "0.85rem" }} />
                Profile updated successfully.
              </div>
            )}
            {saveError && (
              <div style={{
                display: "flex", alignItems: "center", gap: "0.6rem",
                padding: "0.65rem 1rem", borderRadius: "0.45rem",
                background: "hsl(0 72% 51% / 0.09)",
                border: `1px solid hsl(0 72% 51% / 0.3)`,
                fontSize: "0.8rem", color: C.expense, fontWeight: 600,
              }}>
                <AlertTriangle style={{ width: "0.85rem", height: "0.85rem" }} />
                {saveError}
              </div>
            )}

            {/* Read-only fields */}
            <div>
              <SectionTitle>Account Details</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <InfoRow icon={Mail}     label="Email Address" value={user.email} />
                <InfoRow icon={Shield}   label="Role"          value={<RoleBadge roleId={user.role_id} userId={user.id} />} />
                <InfoRow icon={Calendar} label="Member Since"  value={new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} />
              </div>
            </div>

            {/* Editable fields */}
            <div>
              <SectionTitle>Personal Information</SectionTitle>
              {isEditing ? (
                <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "1fr 1fr" }}>
                  <EditableField label="First Name"  value={firstName}  onChange={setFirstName}  placeholder="First name" />
                  <EditableField label="Last Name"   value={lastName}   onChange={setLastName}   placeholder="Last name" />
                  <div style={{ gridColumn: "1 / -1" }}>
                    <EditableField label="Middle Name" value={middleName} onChange={setMiddleName} placeholder="Middle name (optional)" />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <EditableField label="Phone Number" value={phone} onChange={setPhone} placeholder="e.g. 09123456789" type="tel" />
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <InfoRow icon={User}  label="Full Name"    value={fullName || "—"} />
                  <InfoRow icon={Phone} label="Phone Number" value={user.phone_number || "—"} />
                </div>
              )}
            </div>

            {/* Locked email notice */}
            <div style={{
              display:      "flex",
              alignItems:   "center",
              gap:          "0.5rem",
              padding:      "0.6rem 0.875rem",
              borderRadius: "0.4rem",
              background:   "hsl(220,14%,97%)",
              border:       `1px solid ${C.border}`,
              fontSize:     "0.75rem",
              color:        C.fgMuted,
            }}>
              <Lock style={{ width: "0.75rem", height: "0.75rem", flexShrink: 0 }} />
              Email address cannot be changed. Contact an administrator if needed.
            </div>

          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ACCOUNT TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "account" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Account summary card */}
          <div style={{
            background:   C.surface,
            border:       `1px solid ${C.border}`,
            borderRadius: "0.75rem",
            padding:      "1.25rem 1.5rem",
            boxShadow:    "0 1px 4px hsl(220 13% 80% / 0.3)",
          }}>
            <p style={{ fontSize: "0.9rem", fontWeight: 700, color: C.fg, margin: "0 0 0.2rem" }}>
              Account Summary
            </p>
            <p style={{ fontSize: "0.75rem", color: C.fgLight, margin: "0 0 1rem" }}>
              Your account information at a glance
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <InfoRow icon={Mail}     label="Email"       value={user.email} />
              <InfoRow icon={Shield}   label="Role"        value={<>{roleLabel} <RoleBadge roleId={user.role_id} userId={user.id} /></>} />
              <InfoRow icon={Calendar} label="Joined"      value={new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} />
              <InfoRow icon={User}     label="User ID"     value={`#${user.id}`} />
            </div>
          </div>

          {/* Danger zone */}
          <div style={{
            background:   C.surface,
            border:       `1px solid hsl(0 72% 51% / 0.25)`,
            borderRadius: "0.75rem",
            overflow:     "hidden",
            boxShadow:    "0 1px 4px hsl(0 72% 51% / 0.06)",
          }}>
            <div style={{
              padding:      "0.875rem 1.5rem",
              borderBottom: `1px solid hsl(0 72% 51% / 0.2)`,
              background:   "hsl(0 72% 51% / 0.04)",
            }}>
              <p style={{ fontSize: "0.85rem", fontWeight: 700, color: C.expense, margin: 0 }}>
                Danger Zone
              </p>
              <p style={{ fontSize: "0.73rem", color: C.fgLight, margin: "0.15rem 0 0" }}>
                Permanent and irreversible actions
              </p>
            </div>
            <div style={{ padding: "1.25rem 1.5rem" }}>
              <div style={{
                display:        "flex",
                alignItems:     "center",
                justifyContent: "space-between",
                gap:            "1rem",
                flexWrap:       "wrap",
              }}>
                <div>
                  <p style={{ fontSize: "0.85rem", fontWeight: 600, color: C.fg, margin: 0 }}>
                    Delete My Account
                  </p>
                  <p style={{ fontSize: "0.75rem", color: C.fgLight, margin: "0.25rem 0 0", lineHeight: 1.5 }}>
                    Permanently deletes your account. Your past transactions will be retained for record-keeping.
                    This action <strong>cannot be und
                      
                      one</strong>.
                  </p>
                </div>
                {/* Placeholder — not wired yet */}
                <button
                  disabled
                  title="Coming soon"
                  style={{
                    display:         "flex",
                    alignItems:      "center",
                    gap:             "0.4rem",
                    padding:         "0.5rem 1rem",
                    borderRadius:    "0.45rem",
                    fontSize:        "0.78rem",
                    fontWeight:      600,
                    border:          `1px solid hsl(0 72% 51% / 0.3)`,
                    background:      "hsl(0 72% 51% / 0.06)",
                    color:           "hsl(0 72% 51% / 0.45)",
                    cursor:          "not-allowed",
                    flexShrink:      0,
                  }}
                >
                  <Trash2 style={{ width: "0.8rem", height: "0.8rem" }} />
                  Delete Account
                  <span style={{
                    fontSize:        "0.6rem",
                    fontWeight:      700,
                    padding:         "0.1rem 0.35rem",
                    borderRadius:    "0.25rem",
                    backgroundColor: "hsl(45 85% 50% / 0.15)",
                    color:           C.warning,
                    border:          `1px solid ${C.warning}40`,
                    marginLeft:      "0.2rem",
                  }}>
                    SOON
                  </span>
                </button>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}