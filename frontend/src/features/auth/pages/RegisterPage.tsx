// src/pages/auth/Register.tsx
import { useState, useEffect, useRef } from "react"
import type { ChangeEvent, FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import api from "../../../services/apiClient"
import { validateRegister } from "../schemas/register"
import type { RegisterForm } from "../schemas/register"

// ── Design tokens — exact match to LoginPage / DashboardPage ─────────────────
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

// ── Floating particles (same system as LoginPage) ─────────────────────────────
interface Particle {
  id: number
  x: number
  duration: number
  opacity: number
  color: string
  label: string
  fontSize: number
}

const LABELS = ["+₱240", "-₱85", "+₱1,200", "-₱340", "+₱67", "-₱22", "+₱890", "-₱430", "+₱3,500", "-₱120"]
const COLORS  = [S.income, S.primary, S.expense, S.primary, S.income]
let _pid = 0

function makeParticle(): Particle {
  const id = _pid++
  return {
    id,
    x:        Math.random() * 88 + 4,
    duration: Math.random() * 14 + 16,
    opacity:  Math.random() * 0.055 + 0.025,
    color:    COLORS[id % COLORS.length],
    label:    LABELS[id % LABELS.length],
    fontSize: Math.random() * 2 + 9,
  }
}

export default function Register() {
  const navigate = useNavigate()

  const [step, setStep] = useState<1 | 2>(1)
  const [form, setForm] = useState<RegisterForm>({
    email: "",
    password: "",
    firstName: "",
    middleName: "",
    lastName: "",
    phoneNumber: "",
  })
  const [errors, setErrors]               = useState<string[]>([])
  const [loading, setLoading]             = useState(false)
  const [message, setMessage]             = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [countdown, setCountdown]         = useState<number | null>(null)
  const [sendCooldown, setSendCooldown]   = useState(0)
  const [sendCount, setSendCount]         = useState(0)
  const [mounted, setMounted]             = useState(false)
  const [particles, setParticles]         = useState<Particle[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const MAX_SENDS   = 3
  const COOLDOWN_TIME = 60

  // Card mount animation
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60)
    return () => clearTimeout(t)
  }, [])

  // Particle spawner
  useEffect(() => {
    let alive = true
    function scheduleNext() {
      const delay = Math.random() * 7000 + 7000
      timerRef.current = setTimeout(() => {
        if (!alive) return
        const p = makeParticle()
        setParticles(prev => [...prev, p])
        setTimeout(() => {
          setParticles(prev => prev.filter(x => x.id !== p.id))
        }, (p.duration + 2) * 1000)
        scheduleNext()
      }, delay)
    }
    scheduleNext()
    return () => {
      alive = false
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  // Cooldown ticker
  useEffect(() => {
    if (sendCooldown <= 0) return
    const timer = setTimeout(() => setSendCooldown(prev => prev - 1), 1000)
    return () => clearTimeout(timer)
  }, [sendCooldown])

  // Redirect countdown
  useEffect(() => {
    if (countdown === null) return
    if (countdown === 0) { navigate("/login"); return }
    const timer = setTimeout(() => {
      setCountdown(prev => (prev !== null ? prev - 1 : null))
    }, 1000)
    return () => clearTimeout(timer)
  }, [countdown, navigate])

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  const handleBackStep = () => {
    setStep(1)
    setVerificationCode("")
    setMessage("")
  }

  const handleNextStep = async (event: FormEvent) => {
    event.preventDefault()
    setErrors([])
    setMessage("")
    setLoading(true)
    const validationErrors = validateRegister(form)
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      setLoading(false)
      return
    }
    setStep(2)
    setLoading(false)
  }

  const handleSendCode = async () => {
    if (sendCooldown > 0 || sendCount >= MAX_SENDS) return
    setErrors([])
    setMessage("")
    setLoading(true)
    try {
      await api.post("api/auth/send-code", { email: form.email })
      setMessage("Verification code sent to your email.")
      setSendCooldown(COOLDOWN_TIME)
      setSendCount(prev => prev + 1)
    } catch {
      setErrors(["Failed to send verification code."])
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (e: FormEvent) => {
    e.preventDefault()
    setErrors([])
    setMessage("")
    setLoading(true)
    try {
      await api.post("api/auth/register", {
        email:             form.email,
        password:          form.password,
        first_name:        form.firstName,
        middle_name:       form.middleName || null,
        last_name:         form.lastName,
        phone_number:      form.phoneNumber || null,
        verification_code: verificationCode,
      })
      setMessage("Account created successfully. Redirecting...")
      setCountdown(3)
    } catch (err: any) {
      if (err.response?.data?.detail) setErrors([err.response.data.detail])
      else                             setErrors(["Verification failed."])
    } finally {
      setLoading(false)
    }
  }

  const handleCodeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "")
    if (value.length <= 6) setVerificationCode(value)
  }

  const isCodeValid = verificationCode.length === 6

  const maskEmail = (email: string) => {
    const [name, domain] = email.split("@")
    if (!name || !domain) return email
    if (name.length <= 2) return name[0] + "*@" + domain
    return `${name[0]}${"*".repeat(name.length - 2)}${name[name.length - 1]}@${domain}`
  }

  return (
    <>
      <title>TransacScope — Create Account</title>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .reg-root {
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: ${S.bgDeep};
          position: relative;
          overflow: hidden;
          padding: 2rem 0;
        }

        .reg-root::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 80% 60% at 15% 50%, hsl(199 89% 48% / 0.06) 0%, transparent 60%),
            radial-gradient(ellipse 60% 80% at 85% 20%, hsl(220 25% 20% / 0.4) 0%, transparent 60%),
            radial-gradient(ellipse 40% 40% at 75% 85%, hsl(160 60% 45% / 0.04) 0%, transparent 50%);
          pointer-events: none;
        }

        .reg-root::after {
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

        @keyframes floatOnce {
          0%   { transform: translateY(0);      opacity: 0; }
          8%   { opacity: 1; }
          88%  { opacity: 1; }
          100% { transform: translateY(-105vh); opacity: 0; }
        }

        .particle {
          position: absolute;
          bottom: -2%;
          font-family: 'DM Mono', monospace;
          font-weight: 500;
          white-space: nowrap;
          pointer-events: none;
          letter-spacing: 0.02em;
          animation: floatOnce linear forwards;
        }

        /* ── Card ── */
        .reg-card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 460px;
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
        .reg-card.mounted { opacity: 1; transform: translateY(0); }

        /* ── Logo ── */
        .logo-row { display: flex; align-items: center; gap: 10px; margin-bottom: 2rem; }
        .logo-icon-wrap {
          width: 36px; height: 36px; border-radius: 10px;
          background: hsl(199 89% 48% / 0.12);
          border: 1px solid hsl(199 89% 48% / 0.25);
          display: flex; align-items: center; justify-content: center;
        }
        .logo-icon-wrap img { width: 20px; height: 20px; }
        .logo-name { font-size: 15px; font-weight: 700; letter-spacing: -0.02em; color: ${S.foreground}; }

        /* ── Step indicator ── */
        .step-indicator {
          display: flex;
          align-items: center;
          gap: 0;
          margin-bottom: 2rem;
        }
        .step-dot {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          font-size: 12px;
          font-weight: 700;
          transition: background 0.25s, color 0.25s, border-color 0.25s;
        }
        .step-dot.active {
          background: ${S.primary};
          color: hsl(220,28%,7%);
          border: none;
        }
        .step-dot.done {
          background: hsl(199 89% 48% / 0.15);
          color: ${S.primary};
          border: 1px solid hsl(199 89% 48% / 0.35);
        }
        .step-dot.inactive {
          background: ${S.accent};
          color: ${S.muted};
          border: 1px solid ${S.border};
        }
        .step-connector {
          flex: 1;
          height: 1px;
          margin: 0 6px;
          transition: background 0.25s;
        }
        .step-connector.done { background: ${S.primary}; opacity: 0.35; }
        .step-connector.inactive { background: ${S.border}; }

        .step-labels {
          display: flex;
          justify-content: space-between;
          margin-top: 6px;
          margin-bottom: 2rem;
        }
        .step-label-item {
          font-size: 10px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          font-weight: 600;
          flex: 1;
          text-align: center;
        }
        .step-label-item:first-child { text-align: left; }
        .step-label-item:last-child  { text-align: right; }

        /* ── Headings ── */
        .card-title { font-size: 24px; font-weight: 700; letter-spacing: -0.03em; color: ${S.accentFg}; margin-bottom: 6px; line-height: 1.15; }
        .card-subtitle { font-size: 13px; color: ${S.muted}; margin-bottom: 2rem; font-weight: 400; }
        .accent-line {
          width: 36px; height: 3px; border-radius: 2px;
          background: linear-gradient(90deg, ${S.primary}, hsl(199 89% 48% / 0.3));
          margin-bottom: 2rem;
        }

        /* ── Feedback ── */
        .error-box {
          background: hsl(0 72% 51% / 0.08); border: 1px solid hsl(0 72% 51% / 0.25);
          border-radius: 10px; padding: 10px 14px; margin-bottom: 1.25rem;
        }
        .error-box p { font-size: 12.5px; color: hsl(0,72%,65%); line-height: 1.5; }

        .success-box {
          background: hsl(160 60% 45% / 0.08); border: 1px solid hsl(160 60% 45% / 0.25);
          border-radius: 10px; padding: 10px 14px; margin-bottom: 1.25rem;
        }
        .success-box p { font-size: 12.5px; color: hsl(160,60%,60%); line-height: 1.5; }

        .countdown-box {
          background: hsl(199 89% 48% / 0.08); border: 1px solid hsl(199 89% 48% / 0.2);
          border-radius: 10px; padding: 8px 14px; margin-bottom: 1rem;
          font-size: 12.5px; color: ${S.primary}; text-align: center;
          font-family: 'DM Mono', monospace;
        }

        /* ── Form fields ── */
        .field-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .field-grid .field-wrap.full { grid-column: 1 / -1; }

        .field-group { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem; }
        .field-wrap  { display: flex; flex-direction: column; gap: 6px; }

        .field-label {
          font-size: 11.5px; font-weight: 600; letter-spacing: 0.06em;
          text-transform: uppercase; color: ${S.muted};
          display: flex; align-items: center; gap: 4px;
        }
        .required-star { color: ${S.expense}; font-size: 10px; }
        .optional-tag {
          font-size: 9.5px; color: hsl(220,10%,36%);
          font-weight: 500; letter-spacing: 0.03em;
          text-transform: none; font-style: italic;
        }

        .field-input {
          width: 100%; background: ${S.accent}; border: 1px solid ${S.border};
          border-radius: 10px; padding: 11px 14px;
          font-family: 'DM Sans', sans-serif; font-size: 14px; color: ${S.accentFg};
          outline: none; transition: border-color 0.2s, box-shadow 0.2s;
        }
        .field-input::placeholder { color: hsl(220,10%,34%); }
        .field-input:focus { border-color: ${S.primary}; box-shadow: 0 0 0 3px hsl(199 89% 48% / 0.12); }

        /* ── Buttons ── */
        .submit-btn {
          width: 100%; padding: 12px 20px; border-radius: 10px; border: none; cursor: pointer;
          font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600;
          letter-spacing: 0.01em; color: hsl(220,28%,7%);
          background: linear-gradient(135deg, ${S.primary} 0%, hsl(199 89% 42%) 100%);
          box-shadow: 0 4px 16px hsl(199 89% 48% / 0.25), 0 1px 3px hsl(0 0% 0% / 0.2);
          transition: opacity 0.15s, transform 0.12s, box-shadow 0.15s;
          position: relative; overflow: hidden;
        }
        .submit-btn::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, hsl(0 0% 100% / 0.1) 0%, transparent 60%);
          pointer-events: none;
        }
        .submit-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px hsl(199 89% 48% / 0.35), 0 2px 6px hsl(0 0% 0% / 0.2); }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
        .submit-btn:disabled { opacity: 0.45; cursor: not-allowed; }

        .ghost-btn {
          background: transparent;
          border: 1px solid ${S.border};
          border-radius: 10px;
          padding: 11px 20px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 500;
          color: ${S.muted};
          cursor: pointer;
          transition: border-color 0.15s, color 0.15s, background 0.15s;
          width: 100%;
        }
        .ghost-btn:hover:not(:disabled) {
          border-color: hsl(220,20%,28%);
          color: ${S.foreground};
          background: ${S.accent};
        }
        .ghost-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .send-btn {
          width: 100%; padding: 11px 20px; border-radius: 10px;
          border: 1px solid hsl(199 89% 48% / 0.3);
          font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
          color: ${S.primary};
          background: hsl(199 89% 48% / 0.08);
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s, opacity 0.15s;
        }
        .send-btn:hover:not(:disabled) {
          background: hsl(199 89% 48% / 0.14);
          border-color: hsl(199 89% 48% / 0.5);
        }
        .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .btn-row { display: flex; gap: 0.75rem; margin-top: 1.5rem; }
        .btn-inner { display: flex; align-items: center; justify-content: center; gap: 8px; }

        .spinner {
          width: 14px; height: 14px;
          border: 2px solid hsl(220 28% 7% / 0.3); border-top-color: hsl(220 28% 7%);
          border-radius: 50%; animation: spin 0.7s linear infinite;
        }
        .spinner-muted {
          width: 13px; height: 13px;
          border: 2px solid hsl(199 89% 48% / 0.25); border-top-color: ${S.primary};
          border-radius: 50%; animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Verify step ── */
        .email-badge {
          background: ${S.accent};
          border: 1px solid ${S.border};
          border-radius: 8px;
          padding: 10px 14px;
          margin-bottom: 1.25rem;
          font-size: 12.5px;
          color: ${S.muted};
        }
        .email-badge strong {
          color: ${S.primary};
          font-family: 'DM Mono', monospace;
          font-weight: 500;
        }

        .code-input {
          width: 100%;
          background: ${S.accent};
          border: 1px solid ${S.border};
          border-radius: 10px;
          padding: 14px;
          font-family: 'DM Mono', monospace;
          font-size: 22px;
          font-weight: 600;
          color: ${S.accentFg};
          letter-spacing: 0.35em;
          text-align: center;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          margin-bottom: 0.75rem;
        }
        .code-input::placeholder { color: hsl(220,10%,28%); letter-spacing: 0.2em; font-size: 18px; }
        .code-input:focus { border-color: ${S.primary}; box-shadow: 0 0 0 3px hsl(199 89% 48% / 0.12); }
        .code-input.valid { border-color: hsl(160 60% 45% / 0.5); }

        .limit-warning {
          font-size: 11.5px;
          color: ${S.expense};
          background: hsl(0 72% 51% / 0.06);
          border: 1px solid hsl(0 72% 51% / 0.2);
          border-radius: 8px;
          padding: 8px 12px;
          margin-top: 0.5rem;
          text-align: center;
        }

        .card-divider { height: 1px; background: ${S.border}; margin: 1.5rem 0; }

        .card-footer { text-align: center; font-size: 13px; color: ${S.muted}; }
        .card-footer a { color: ${S.primary}; text-decoration: none; font-weight: 600; transition: color 0.15s; }
        .card-footer a:hover { color: hsl(199,89%,62%); }
      `}</style>

      <div className="reg-root">

        {/* Particles */}
        {particles.map((p) => (
          <span
            key={p.id}
            className="particle"
            style={{
              left:              `${p.x}%`,
              color:             p.color,
              opacity:           p.opacity,
              fontSize:          `${p.fontSize}px`,
              animationDuration: `${p.duration}s`,
            }}
          >
            {p.label}
          </span>
        ))}

        <div className={`reg-card${mounted ? " mounted" : ""}`}>

          {/* Logo */}
          <div className="logo-row">
            <div className="logo-icon-wrap">
              <img src="/vite.svg" alt="TransacScope" />
            </div>
            <span className="logo-name">TransacScope</span>
          </div>

          {/* Step indicator */}
          <div className="step-indicator">
            <div className={`step-dot ${step === 1 ? "active" : "done"}`}>
              {step > 1 ? "✓" : "1"}
            </div>
            <div className={`step-connector ${step > 1 ? "done" : "inactive"}`} />
            <div className={`step-dot ${step === 2 ? "active" : "inactive"}`}>2</div>
          </div>
          <div className="step-labels">
            <span className="step-label-item" style={{ color: step === 1 ? S.primary : S.muted }}>
              Your Details
            </span>
            <span className="step-label-item" style={{ color: step === 2 ? S.primary : S.muted }}>
              Verify Email
            </span>
          </div>

          {/* Title */}
          {step === 1 ? (
            <>
              <h1 className="card-title">Create an account</h1>
              <p className="card-subtitle">Fill in your details to get started</p>
            </>
          ) : (
            <>
              <h1 className="card-title">Verify your email</h1>
              <p className="card-subtitle">One last step — confirm your email address</p>
            </>
          )}
          <div className="accent-line" />

          {/* Errors */}
          {errors.length > 0 && (
            <div className="error-box">
              {errors.map((err, i) => <p key={i}>⚠ {err}</p>)}
            </div>
          )}

          {/* Success message */}
          {message && (
            <div className="success-box">
              <p>✓ {message}</p>
            </div>
          )}

          {/* Countdown */}
          {countdown !== null && countdown > 0 && (
            <div className="countdown-box">
              Redirecting to login in {countdown}s…
            </div>
          )}

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <form onSubmit={handleNextStep}>
              <div className="field-grid">
                <div className="field-wrap">
                  <label className="field-label">
                    First Name <span className="required-star">*</span>
                  </label>
                  <input
                    className="field-input"
                    type="text"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    placeholder="Juan"
                    maxLength={50}
                    required
                  />
                </div>

                <div className="field-wrap">
                  <label className="field-label">
                    Middle Name <span className="optional-tag">optional</span>
                  </label>
                  <input
                    className="field-input"
                    type="text"
                    name="middleName"
                    value={form.middleName}
                    onChange={handleChange}
                    placeholder="Santos"
                    maxLength={50}
                  />
                </div>

                <div className="field-wrap">
                  <label className="field-label">
                    Last Name <span className="required-star">*</span>
                  </label>
                  <input
                    className="field-input"
                    type="text"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    placeholder="dela Cruz"
                    maxLength={50}
                    required
                  />
                </div>

                <div className="field-wrap">
                  <label className="field-label">
                    Phone <span className="optional-tag">optional</span>
                  </label>
                  <input
                    className="field-input"
                    type="text"
                    name="phoneNumber"
                    value={form.phoneNumber}
                    onChange={handleChange}
                    placeholder="09XXXXXXXXX"
                    maxLength={11}
                  />
                </div>

                <div className="field-wrap full">
                  <label className="field-label">
                    Email <span className="required-star">*</span>
                  </label>
                  <input
                    className="field-input"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="juan@example.com"
                    required
                  />
                </div>

                <div className="field-wrap full">
                  <label className="field-label">
                    Password <span className="required-star">*</span>
                  </label>
                  <input
                    className="field-input"
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Create a strong password"
                    maxLength={72}
                    required
                  />
                </div>
              </div>

              <button className="submit-btn" type="submit" disabled={loading}>
                <span className="btn-inner">
                  {loading && <span className="spinner" />}
                  {loading ? "Checking…" : "Continue →"}
                </span>
              </button>

              <div className="card-divider" />
              <p className="card-footer">
                Already have an account?{" "}
                <Link to="/login">Sign in</Link>
              </p>
            </form>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <form onSubmit={handleVerifyCode}>

              {/* Email badge */}
              <div className="email-badge">
                {sendCount === 0
                  ? <>Code will be sent to <strong>{maskEmail(form.email)}</strong></>
                  : <>Enter the 6-digit code sent to <strong>{maskEmail(form.email)}</strong></>
                }
              </div>

              {/* Code input */}
              <div className="field-wrap" style={{ marginBottom: "1rem" }}>
                <label className="field-label">Verification Code</label>
                <input
                  className={`code-input${isCodeValid ? " valid" : ""}`}
                  type="text"
                  inputMode="numeric"
                  pattern="\d*"
                  value={verificationCode}
                  onChange={handleCodeChange}
                  placeholder="· · · · · ·"
                  maxLength={6}
                />
              </div>

              {/* Send code button */}
              <button
                type="button"
                className="send-btn"
                onClick={handleSendCode}
                disabled={loading || sendCooldown > 0 || sendCount >= MAX_SENDS}
              >
                <span className="btn-inner">
                  {loading && sendCount === 0 && <span className="spinner-muted" />}
                  {loading && sendCount === 0
                    ? "Sending…"
                    : sendCooldown > 0
                    ? `Resend in ${sendCooldown}s`
                    : sendCount >= MAX_SENDS
                    ? "Send Limit Reached"
                    : sendCount === 0
                    ? "Send Code"
                    : "Resend Code"}
                </span>
              </button>

              {sendCount >= MAX_SENDS && (
                <p className="limit-warning">
                  ⚠ Maximum verification attempts reached. Please try again later.
                </p>
              )}

              {/* Action buttons */}
              <div className="btn-row">
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={handleBackStep}
                  disabled={loading}
                  style={{ flex: "0 0 auto", width: "auto", padding: "12px 20px" }}
                >
                  ← Back
                </button>
                <button
                  className="submit-btn"
                  type="submit"
                  disabled={!isCodeValid || loading}
                  style={{ flex: 1 }}
                >
                  <span className="btn-inner">
                    {loading && <span className="spinner" />}
                    {loading ? "Verifying…" : "Verify & Create Account"}
                  </span>
                </button>
              </div>

            </form>
          )}

        </div>
      </div>
    </>
  )
}