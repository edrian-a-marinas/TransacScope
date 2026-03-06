// src/pages/auth/Login.tsx
import { useState, useContext, useEffect } from "react"
import type { ChangeEvent, FormEvent } from "react"
import { validateLogin } from "../schemas/login"
import type { LoginForm } from "../schemas/login"
import { UserSchema } from "../schemas/userAuth"
import api from "../../../services/apiClient"
import { AuthContext } from "../AuthContext"
import { Link } from "react-router-dom"

// ── Design tokens mirroring DashboardPage sidebar ────────────────────────────
const S = {
  bg:         "hsl(220,25%,10%)",
  bgDeep:     "hsl(220,28%,7%)",
  surface:    "hsl(220,20%,14%)",
  accent:     "hsl(220,20%,16%)",
  accentFg:   "hsl(220,14%,90%)",
  primary:    "hsl(199,89%,48%)",
  primaryDim: "hsl(199,89%,38%)",
  muted:      "hsl(220,10%,46%)",
  border:     "hsl(220,20%,18%)",
  foreground: "hsl(220,14%,85%)",
  income:     "hsl(160,60%,45%)",
  expense:    "hsl(0,72%,51%)",
}

// ── Floating particle (transaction blips) ────────────────────────────────────
interface Particle {
  id: number
  x: number
  y: number
  size: number
  speed: number
  opacity: number
  color: string
  label: string
}

function generateParticles(count: number): Particle[] {
  const labels = ["+₱240", "-₱85", "+₱1,200", "-₱340", "+₱67", "-₱22", "+₱890", "-₱430"]
  const colors = [S.income, S.primary, S.expense, S.primary, S.income]
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 0.5 + 0.2,
    speed: Math.random() * 40 + 35,
    opacity: Math.random() * 0.07 + 0.03,
    color: colors[i % colors.length],
    label: labels[i % labels.length],
  }))
}

export default function Login() {
  const { setLoggedIn, setUser } = useContext(AuthContext)
  const [form, setForm] = useState<LoginForm>({ email: "", password: "" })
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [particles] = useState(() => generateParticles(8))
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60)
    return () => clearTimeout(t)
  }, [])

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (loading) return
    setErrors([])
    setMessage("")
    const validationErrors = validateLogin(form)
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }
    setLoading(true)
    try {
      const response = await api.post("api/auth/login", form)
      const { access_token, token_type, user } = response.data
      const parsedUser = UserSchema.parse(user)
      localStorage.setItem("access_token", access_token)
      localStorage.setItem("token_type", token_type)
      setLoggedIn(true)
      setUser(parsedUser)
    } catch (err: any) {
      if (!err.response) {
        setErrors(["Cannot connect to server."])
      } else if (err.response.status === 401) {
        setErrors(["Invalid credentials or inactive account"])
      } else if (err.response.status === 500) {
        setErrors(["Internal server error. Try again later."])
      } else {
        setErrors(["Login failed. Try again later."])
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <title>TransacScope — Sign In</title>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .login-root {
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: ${S.bgDeep};
          position: relative;
          overflow: hidden;
        }

        /* Layered background */
        .login-root::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 80% 60% at 15% 50%, hsl(199 89% 48% / 0.06) 0%, transparent 60%),
            radial-gradient(ellipse 60% 80% at 85% 20%, hsl(220 25% 20% / 0.4) 0%, transparent 60%),
            radial-gradient(ellipse 40% 40% at 75% 85%, hsl(160 60% 45% / 0.04) 0%, transparent 50%);
          pointer-events: none;
        }

        /* Grid overlay */
        .login-root::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(hsl(220 20% 18% / 0.3) 1px, transparent 1px),
            linear-gradient(90deg, hsl(220 20% 18% / 0.3) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
          mask-image: radial-gradient(ellipse 90% 90% at 50% 50%, black 30%, transparent 100%);
        }

        /* Floating particles */
        .particle {
          position: absolute;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          font-weight: 500;
          white-space: nowrap;
          pointer-events: none;
          animation: floatUp linear infinite;
          letter-spacing: 0.02em;
        }

        @keyframes floatUp {
          0%   { transform: translateY(0) translateX(0);    opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(-110vh) translateX(20px); opacity: 0; }
        }

        /* Card */
        .login-card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 420px;
          margin: 1.5rem;
          background: ${S.surface};
          border: 1px solid ${S.border};
          border-radius: 20px;
          padding: 2.5rem;
          box-shadow:
            0 0 0 1px hsl(220 20% 20% / 0.5),
            0 24px 64px hsl(220 28% 4% / 0.6),
            0 0 80px hsl(199 89% 48% / 0.04);
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }

        .login-card.mounted {
          opacity: 1;
          transform: translateY(0);
        }

        /* Logo row */
        .logo-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 2rem;
        }

        .logo-icon-wrap {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: hsl(199 89% 48% / 0.12);
          border: 1px solid hsl(199 89% 48% / 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logo-icon-wrap img {
          width: 20px;
          height: 20px;
        }

        .logo-name {
          font-size: 15px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: ${S.foreground};
        }

        /* Heading */
        .card-title {
          font-size: 26px;
          font-weight: 700;
          letter-spacing: -0.03em;
          color: ${S.accentFg};
          margin-bottom: 6px;
          line-height: 1.15;
        }

        .card-subtitle {
          font-size: 13px;
          color: ${S.muted};
          margin-bottom: 2rem;
          font-weight: 400;
        }

        /* Divider accent line */
        .accent-line {
          width: 36px;
          height: 3px;
          border-radius: 2px;
          background: linear-gradient(90deg, ${S.primary}, hsl(199 89% 48% / 0.3));
          margin-bottom: 2rem;
        }

        /* Error box */
        .error-box {
          background: hsl(0 72% 51% / 0.08);
          border: 1px solid hsl(0 72% 51% / 0.25);
          border-radius: 10px;
          padding: 10px 14px;
          margin-bottom: 1.25rem;
        }

        .error-box p {
          font-size: 12.5px;
          color: hsl(0, 72%, 65%);
          line-height: 1.5;
        }

        /* Form fields */
        .field-group {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .field-wrap {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .field-label {
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: ${S.muted};
        }

        .field-input {
          width: 100%;
          background: ${S.accent};
          border: 1px solid ${S.border};
          border-radius: 10px;
          padding: 11px 14px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          color: ${S.accentFg};
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .field-input::placeholder {
          color: hsl(220,10%,34%);
        }

        .field-input:focus {
          border-color: ${S.primary};
          box-shadow: 0 0 0 3px hsl(199 89% 48% / 0.12);
        }

        /* Submit button */
        .submit-btn {
          width: 100%;
          padding: 12px 20px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.01em;
          color: hsl(220,28%,7%);
          background: linear-gradient(135deg, ${S.primary} 0%, hsl(199 89% 42%) 100%);
          box-shadow: 0 4px 16px hsl(199 89% 48% / 0.25), 0 1px 3px hsl(0 0% 0% / 0.2);
          transition: opacity 0.15s, transform 0.12s, box-shadow 0.15s;
          position: relative;
          overflow: hidden;
        }

        .submit-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, hsl(0 0% 100% / 0.1) 0%, transparent 60%);
          pointer-events: none;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px hsl(199 89% 48% / 0.35), 0 2px 6px hsl(0 0% 0% / 0.2);
        }

        .submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .submit-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        /* Spinner inside button */
        .btn-inner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .spinner {
          width: 14px;
          height: 14px;
          border: 2px solid hsl(220 28% 7% / 0.3);
          border-top-color: hsl(220 28% 7%);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Footer link */
        .card-footer {
          margin-top: 1.5rem;
          text-align: center;
          font-size: 13px;
          color: ${S.muted};
        }

        .card-footer a {
          color: ${S.primary};
          text-decoration: none;
          font-weight: 600;
          transition: color 0.15s;
        }

        .card-footer a:hover {
          color: hsl(199,89%,62%);
        }

        /* Divider */
        .card-divider {
          height: 1px;
          background: ${S.border};
          margin: 1.5rem 0;
        }

        /* Stats badge row below */
        .stats-row {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }

        .stat-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          flex: 1;
        }

        .stat-num {
          font-size: 13px;
          font-weight: 700;
          font-family: 'DM Mono', monospace;
          color: ${S.foreground};
        }

        .stat-lbl {
          font-size: 10px;
          color: ${S.muted};
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .stat-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          margin-bottom: 2px;
        }
      `}</style>

      <div className="login-root">
        {/* Floating transaction particles */}
        {particles.map((p) => (
          <span
            key={p.id}
            className="particle"
            style={{
              left: `${p.x}%`,
              bottom: "-5%",
              color: p.color,
              opacity: p.opacity,
              fontSize: `${9 + p.size * 1.5}px`,
              animationDuration: `${p.speed}s`,
              animationDelay: `${(p.id / particles.length) * p.speed}s`,
            }}
          >
            {p.label}
          </span>
        ))}

        <div className={`login-card${mounted ? " mounted" : ""}`}>
          {/* Logo */}
          <div className="logo-row">
            <div className="logo-icon-wrap">
              <img src="/vite.svg" alt="TransacScope" />
            </div>
            <span className="logo-name">TransacScope</span>
          </div>

          {/* Heading */}
          <h1 className="card-title">Welcome back</h1>
          <p className="card-subtitle">Sign in to your account to continue</p>
          <div className="accent-line" />

          {/* Errors */}
          {errors.length > 0 && (
            <div className="error-box">
              {errors.map((err, i) => (
                <p key={i}>⚠ {err}</p>
              ))}
            </div>
          )}
          {message && (
            <div style={{ color: S.income, fontSize: 13, marginBottom: "1rem" }}>{message}</div>
          )}

          {/* Form — NO <form> tag changed; logic untouched */}
          <form onSubmit={handleSubmit}>
            <div className="field-group">
              <div className="field-wrap">
                <label className="field-label" htmlFor="email">Email</label>
                <input
                  id="email"
                  className="field-input"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  required
                />
              </div>
              <div className="field-wrap">
                <label className="field-label" htmlFor="password">Password</label>
                <input
                  id="password"
                  className="field-input"
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  required
                />
              </div>
            </div>

            <button className="submit-btn" type="submit" disabled={loading}>
              <span className="btn-inner">
                {loading && <span className="spinner" />}
                {loading ? "Signing in…" : "Sign In"}
              </span>
            </button>
          </form>

          {/* Divider + stats */}
          <div className="card-divider" />
          <div className="stats-row">
            <div className="stat-badge">
              <div className="stat-dot" style={{ background: S.income }} />
              <span className="stat-num">₱ —</span>
              <span className="stat-lbl">Income</span>
            </div>
            <div className="stat-badge">
              <div className="stat-dot" style={{ background: S.expense }} />
              <span className="stat-num">₱ —</span>
              <span className="stat-lbl">Expense</span>
            </div>
            <div className="stat-badge">
              <div className="stat-dot" style={{ background: S.primary }} />
              <span className="stat-num">₱ —</span>
              <span className="stat-lbl">Net</span>
            </div>
          </div>

          {/* Footer */}
          <p className="card-footer" style={{ marginTop: "1.25rem" }}>
            Don't have an account?{" "}
            <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>
    </>
  )
}