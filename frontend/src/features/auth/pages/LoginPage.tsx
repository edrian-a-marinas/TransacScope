import { useState, useContext, useEffect } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link } from "react-router-dom";
import { validateLogin } from "../schemas/login";
import type { LoginForm } from "../schemas/login";
import { UserSchema } from "../schemas/userAuth";
import api from "../../../services/apiClient";
import { AuthContext } from "../AuthContext";
import { S } from "../lib/authConst";
import { useParticles } from "../lib/useParticles";
import { buildAuthStyles } from "../lib/authStyles";
import PrototypeBadge from "../lib/authToolTip";
import WatchDemoLink from "../lib/authDemoVid";

// ── Frontend rate-limit config (mirrors backend) ──────────────────────────────
const FE_MAX_ATTEMPTS    = 5;
const FE_LOCKOUT_MINUTES = 3;
const LOCKOUT_KEY        = "login_lockout";

interface LockoutData {
  attempts:    number;
  lockedUntil: number | null;
}

function getLockout(): LockoutData {
  try {
    const raw = localStorage.getItem(LOCKOUT_KEY);
    if (!raw) return { attempts: 0, lockedUntil: null };
    return JSON.parse(raw) as LockoutData;
  } catch {
    return { attempts: 0, lockedUntil: null };
  }
}
function saveLockout(data: LockoutData) {
  localStorage.setItem(LOCKOUT_KEY, JSON.stringify(data));
}
function clearLockout() {
  localStorage.removeItem(LOCKOUT_KEY);
}
export default function Login() {
  const { setLoggedIn, setUser } = useContext(AuthContext);
  const particles = useParticles();

  const [form,          setForm]          = useState<LoginForm>({ email: "", password: "" });
  const [errors,        setErrors]        = useState<string[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [mounted,       setMounted]       = useState(false);
  const [lockedUntil,   setLockedUntil]   = useState<number | null>(null);
  const [lockCountdown, setLockCountdown] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const data = getLockout();
    if (data.lockedUntil && data.lockedUntil > Date.now()) {
      setLockedUntil(data.lockedUntil);
    } else if (data.lockedUntil) {
      clearLockout();
    }
  }, []);

  useEffect(() => {
    if (!lockedUntil) { setLockCountdown(0); return; }
    const tick = () => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(null);
        setLockCountdown(0);
        clearLockout();
      } else {
        setLockCountdown(remaining);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading || lockedUntil) return;
    setErrors([]);
    const validationErrors = validateLogin(form);
    if (validationErrors.length > 0) { setErrors(validationErrors); return; }
    setLoading(true);
    try {
      const response = await api.post("api/auth/login", form);
      const { access_token, token_type, user } = response.data;
      const parsedUser = UserSchema.parse(user);
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("token_type", token_type);
      clearLockout();
      setLoggedIn(true);
      setUser(parsedUser);
    } catch (err: any) {
      if (!err.response) { setErrors(["Cannot connect to server."]); return; }
      const status = err.response.status;
      if (status === 429) {
        const until = Date.now() + FE_LOCKOUT_MINUTES * 60 * 1000;
        setLockedUntil(until);
        saveLockout({ attempts: FE_MAX_ATTEMPTS, lockedUntil: until });
        return;
      }
      if (status === 401) {
        const data        = getLockout();
        const newAttempts = data.attempts + 1;
        if (newAttempts >= FE_MAX_ATTEMPTS) {
          const until = Date.now() + FE_LOCKOUT_MINUTES * 60 * 1000;
          saveLockout({ attempts: newAttempts, lockedUntil: until });
          setLockedUntil(until);
        } else {
          saveLockout({ attempts: newAttempts, lockedUntil: null });
          const remaining = FE_MAX_ATTEMPTS - newAttempts;
          setErrors([
            `Invalid credentials or inactive account — ${remaining} attempt${remaining === 1 ? "" : "s"} remaining`,
          ]);
        }
        return;
      }
      setErrors([status === 500 ? "Internal server error. Try again later." : "Login failed. Try again later."]);
    } finally {
      setLoading(false);
    }
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const isLocked = !!lockedUntil && lockedUntil > Date.now();

  return (
    <>
      <title>TransacScope — Sign In</title>
      <style>{`
        ${buildAuthStyles("login-root", "login-card", 420)}
        .lockout-box {
          background: hsl(45 85% 50% / 0.08);
          border: 1px solid hsl(45 85% 50% / 0.25);
          border-radius: 10px;
          padding: 14px;
          margin-bottom: 1.25rem;
          text-align: center;
        }
        .lockout-title  { font-size: 13px; font-weight: 600; color: hsl(45,85%,65%); margin-bottom: 4px; }
        .lockout-timer  { font-size: 26px; font-weight: 700; font-family: 'DM Mono', monospace; color: hsl(45,85%,60%); letter-spacing: 0.05em; margin-bottom: 4px; }
        .lockout-sub    { font-size: 11.5px; color: hsl(45,85%,40%); }
        .stats-row { display: flex; gap: 1rem; justify-content: center; }
        .stat-badge { display: flex; flex-direction: column; align-items: center; gap: 2px; flex: 1; }
        .stat-num   { font-size: 13px; font-weight: 700; font-family: 'DM Mono', monospace; color: ${S.foreground}; }
        .stat-lbl   { font-size: 10px; color: ${S.muted}; letter-spacing: 0.04em; text-transform: uppercase; }
        .stat-dot   { width: 6px; height: 6px; border-radius: 50%; margin-bottom: 2px; }
      `}</style>

      <div className="login-root">
        {particles.map(p => (
          <span
            key={p.id}
            className="particle"
            style={{ left: `${p.x}%`, color: p.color, opacity: p.opacity, fontSize: `${p.fontSize}px`, animationDuration: `${p.duration}s` }}
          >
            {p.label}
          </span>
        ))}

        <div className={`login-card${mounted ? " mounted" : ""}`}>

          {/* ── Prototype badge ── */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "14px" }}>
            <PrototypeBadge />
          </div>

          <div className="logo-row" style={{ justifyContent: "flex-start" }}>
            <img 
              src="/transacScope1.svg" 
              alt="TransacScope" 
              style={{ height: "100px", width: "auto" }}
            />
          </div>
          <p className="card-subtitle" style={{ textAlign: "center" }}>Sign in to your account to continue</p>


          <div className="accent-line" />

          {isLocked && (
            <div className="lockout-box">
              <p className="lockout-title">⚠ Too many failed attempts</p>
              <p className="lockout-timer">{formatCountdown(lockCountdown)}</p>
              <p className="lockout-sub">Please wait before trying again</p>
            </div>
          )}

          {!isLocked && errors.length > 0 && (
            <div className="error-box">
              {errors.map((err, i) => <p key={i}>⚠ {err}</p>)}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="field-group">
              <div className="field-wrap">
                <label className="field-label" htmlFor="email">Email</label>
                <input
                  id="email" className="field-input"
                  type="email" name="email"
                  placeholder="you@example.com"
                  value={form.email} onChange={handleChange}
                  disabled={isLocked} required
                />
              </div>
              <div className="field-wrap">
                <label className="field-label" htmlFor="password">Password</label>
                <input
                  id="password" className="field-input"
                  type="password" name="password"
                  placeholder="••••••••"
                  value={form.password} onChange={handleChange}
                  disabled={isLocked} required
                />
              </div>
            </div>
            <button className="submit-btn" type="submit" disabled={loading || isLocked}>
              <span className="btn-inner">
                {loading && <span className="spinner" />}
                {loading ? "Signing in…" : isLocked ? `Locked — ${formatCountdown(lockCountdown)}` : "Sign In"}
              </span>
            </button>
          </form>

          <div className="card-divider" />

          <div className="stats-row">
            {[
              { color: S.income,  num: "₱ —", lbl: "Income"  },
              { color: S.expense, num: "₱ —", lbl: "Expense" },
              { color: S.primary, num: "₱ —", lbl: "Net"     },
            ].map(({ color, num, lbl }) => (
              <div key={lbl} className="stat-badge">
                <div className="stat-dot" style={{ background: color }} />
                <span className="stat-num">{num}</span>
                <span className="stat-lbl">{lbl}</span>
              </div>
            ))}
          </div>

          <p className="card-footer" style={{ marginTop: "1.25rem" }}>
            Don't have an account? <Link to="/register">Create one</Link>
          </p>

          <div className="card-divider" style={{ marginTop: "1.25rem" }} />

          <div className="watch-demo-wrap">
            <WatchDemoLink />
          </div>
        </div>
      </div>
    </>
  );
}