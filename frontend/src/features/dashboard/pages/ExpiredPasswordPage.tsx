// pages/ExpiredPasswordPage.tsx
import { useContext, useState } from "react";
import { ShieldAlert, KeyRound, LogOut, Eye, EyeOff } from "lucide-react";
import { AuthContext } from "@/features/auth/AuthContext";
import api from "@/services/apiClient";
import { validatePasswordChange } from "@/features/dashboard/schemas/user";

const C = {
  primary:   "hsl(199,89%,48%)",
  warning:   "hsl(45,85%,50%)",
  surface:   "hsl(0,0%,100%)",
  surfaceSub:"hsl(220,14%,97%)",
  border:    "hsl(220,13%,89%)",
  fg:        "hsl(220,14%,15%)",
  fgLight:   "hsl(220,10%,46%)",
  fgMuted:   "hsl(220,10%,62%)",
  success:   "hsl(160,60%,40%)",
  expense:   "hsl(0,72%,51%)",
};

// ── Defined OUTSIDE ExpiredPasswordPage so React doesn't remount on re-render ─
function PasswordField({
  label, value, onChange, show, onToggle,
}: {
  label:    string;
  value:    string;
  onChange: (v: string) => void;
  show:     boolean;
  onToggle: () => void;
}) {
  return (
    <div style={{ marginBottom: "0.75rem", textAlign: "left" }}>
      <label style={{ fontSize: "0.75rem", fontWeight: 600, color: C.fgLight, display: "block", marginBottom: "0.3rem" }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          type={show ? "password" : "text"}
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            width:        "100%",
            padding:      "0.6rem 2.25rem 0.6rem 0.75rem",
            borderRadius: "0.45rem",
            border:       `1px solid ${C.border}`,
            background:   C.surfaceSub,
            fontSize:     "0.82rem",
            color:        C.fg,
            outline:      "none",
            boxSizing:    "border-box",
          }}
        />
        <button
          type="button"
          onClick={onToggle}
          style={{
            position:  "absolute", right: "0.6rem", top: "50%",
            transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer",
            color: C.fgMuted, display: "flex", alignItems: "center", padding: 0,
          }}
        >
          {show
            ? <EyeOff style={{ width: "0.85rem", height: "0.85rem" }} />
            : <Eye    style={{ width: "0.85rem", height: "0.85rem" }} />
          }
        </button>
      </div>
    </div>
  );
}

export default function ExpiredPasswordPage() {
  const { user, logout, setPasswordExpired } = useContext(AuthContext);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw,     setNewPw]     = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCur,   setShowCur]   = useState(true);
  const [showNew,   setShowNew]   = useState(true);
  const [showCon,   setShowCon]   = useState(true);
  const [errors,    setErrors]    = useState<string[]>([]);
  const [apiError,  setApiError]  = useState<string | null>(null);
  const [success,   setSuccess]   = useState(false);
  const [loading,   setLoading]   = useState(false);

  const handleSubmit = async () => {
    setApiError(null);
    const validationErrors = validatePasswordChange({ currentPw, newPw, confirmPw });
    if (validationErrors.length > 0) { setErrors(validationErrors); return; }
    setErrors([]);
    setLoading(true);
    try {
      const token     = localStorage.getItem("access_token");
      const tokenType = localStorage.getItem("token_type");
      await api.patch(
        "api/users/me/password",
        { current_password: currentPw, new_password: newPw },
        { headers: { Authorization: `${tokenType} ${token}` } },
      );
      localStorage.removeItem("password_expired");
      setPasswordExpired(false);
      setSuccess(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })
          ?.response?.data?.detail ?? "Something went wrong. Please try again.";
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", backgroundColor: C.surfaceSub,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1.5rem",
    }}>
      <div style={{
        background: C.surface, border: `1px solid hsl(45 85% 50% / 0.3)`,
        borderRadius: "1rem", padding: "2.5rem 2rem", maxWidth: "460px", width: "100%",
        boxShadow: "0 8px 32px hsl(45 85% 50% / 0.08), 0 2px 8px rgba(0,0,0,0.06)",
        textAlign: "center",
      }}>

        {/* Icon */}
        <div style={{
          width: "4rem", height: "4rem", borderRadius: "50%",
          backgroundColor: "hsl(45 85% 50% / 0.1)", border: "2px solid hsl(45 85% 50% / 0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 1.5rem",
        }}>
          <ShieldAlert style={{ width: "1.75rem", height: "1.75rem", color: C.warning }} />
        </div>

        <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: C.fg, margin: "0 0 0.5rem" }}>
          Password Expired
        </h1>
        <p style={{ fontSize: "0.85rem", color: C.fgLight, margin: "0 0 1.5rem", lineHeight: 1.6 }}>
          {user?.first_name ? `Hi ${user.first_name}, your` : "Your"} password has expired.
          For the security of business data, passwords must be updated every 90 days.
          You must change your password before accessing the dashboard.
        </p>

        {/* Security notice */}
        <div style={{
          display: "flex", alignItems: "flex-start", gap: "0.6rem",
          padding: "0.75rem 1rem", borderRadius: "0.5rem",
          background: "hsl(45 85% 50% / 0.07)", border: `1px solid hsl(45 85% 50% / 0.3)`,
          marginBottom: "1.5rem", textAlign: "left",
        }}>
          <KeyRound style={{ width: "0.85rem", height: "0.85rem", color: C.warning, flexShrink: 0, marginTop: "0.15rem" }} />
          <p style={{ fontSize: "0.75rem", color: C.fgLight, margin: 0, lineHeight: 1.5 }}>
            Passwords expire every <strong>90 days</strong> to protect transaction records
            and prevent unauthorised access to sensitive financial data.
            You cannot skip this step.
          </p>
        </div>

        {/* Success state */}
        {success ? (
          <div style={{
            padding: "1.25rem", borderRadius: "0.6rem",
            background: "hsl(160 60% 40% / 0.08)", border: `1px solid hsl(160 60% 40% / 0.3)`,
            marginBottom: "1.25rem",
          }}>
            <p style={{ color: C.success, fontWeight: 700, fontSize: "0.85rem", margin: "0 0 0.25rem" }}>
              ✅ Password changed successfully!
            </p>
            <p style={{ color: C.fgLight, fontSize: "0.78rem", margin: 0 }}>
              You now have full access to the dashboard.
            </p>
          </div>
        ) : (
          <div style={{ textAlign: "left", marginBottom: "1.25rem" }}>
            <PasswordField label="Current Password"     value={currentPw} onChange={setCurrentPw} show={showCur} onToggle={() => setShowCur(p => !p)} />
            <PasswordField label="New Password"         value={newPw}     onChange={setNewPw}     show={showNew} onToggle={() => setShowNew(p => !p)} />
            <PasswordField label="Confirm New Password" value={confirmPw} onChange={setConfirmPw} show={showCon} onToggle={() => setShowCon(p => !p)} />

            {errors.length > 0 && (
              <div style={{ marginTop: "0.5rem" }}>
                {errors.map((e, i) => (
                  <p key={i} style={{ fontSize: "0.75rem", color: C.expense, margin: "0.2rem 0" }}>• {e}</p>
                ))}
              </div>
            )}
            {apiError && (
              <p style={{ fontSize: "0.75rem", color: C.expense, marginTop: "0.5rem" }}>• {apiError}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                marginTop: "1rem", display: "flex", alignItems: "center",
                justifyContent: "center", gap: "0.45rem", width: "100%",
                padding: "0.7rem", borderRadius: "0.5rem", fontSize: "0.85rem", fontWeight: 700,
                border: `1px solid hsl(45 85% 50% / 0.4)`,
                background: loading ? "hsl(45 85% 50% / 0.05)" : "hsl(45 85% 50% / 0.12)",
                color: C.warning, cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1, transition: "opacity 0.15s",
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = "0.8"; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.opacity = "1"; }}
            >
              <KeyRound style={{ width: "0.9rem", height: "0.9rem" }} />
              {loading ? "Updating…" : "Change Password"}
            </button>
          </div>
        )}

        <button
          onClick={logout}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: "0.45rem", width: "100%", padding: "0.7rem", borderRadius: "0.5rem",
            fontSize: "0.85rem", fontWeight: 600,
            border: `1px solid ${C.border}`, background: C.surface,
            color: C.fgLight, cursor: "pointer",
            transition: "border-color 0.15s, color 0.15s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = C.fgLight;
            (e.currentTarget as HTMLButtonElement).style.color = C.fg;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;
            (e.currentTarget as HTMLButtonElement).style.color = C.fgLight;
          }}
        >
          <LogOut style={{ width: "0.9rem", height: "0.9rem" }} />
          Log Out
        </button>

      </div>
    </div>
  );
}