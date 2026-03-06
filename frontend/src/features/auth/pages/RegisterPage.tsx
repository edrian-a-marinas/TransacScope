import { useState, useEffect } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../../services/apiClient";
import { validateRegister } from "../schemas/register";
import type { RegisterForm } from "../schemas/register";
import { S } from "../lib/authConst";
import { useParticles } from "../lib/useParticles";
import { buildAuthStyles } from "../lib/authStyles";

const MAX_SENDS    = 3;
const COOLDOWN_TIME = 60;

export default function Register() {
  const navigate  = useNavigate();
  const particles = useParticles();

  const [step,             setStep]             = useState<1 | 2>(1);
  const [form,             setForm]             = useState<RegisterForm>({ email: "", password: "", firstName: "", middleName: "", lastName: "", phoneNumber: "" });
  const [errors,           setErrors]           = useState<string[]>([]);
  const [loading,          setLoading]          = useState(false);
  const [message,          setMessage]          = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [countdown,        setCountdown]        = useState<number | null>(null);
  const [sendCooldown,     setSendCooldown]     = useState(0);
  const [sendCount,        setSendCount]        = useState(0);
  const [mounted,          setMounted]          = useState(false);

  // Card mount animation
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  // Send-code cooldown ticker
  useEffect(() => {
    if (sendCooldown <= 0) return;
    const timer = setTimeout(() => setSendCooldown(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [sendCooldown]);

  // Redirect countdown after successful registration
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) { navigate("/login"); return; }
    const timer = setTimeout(() => setCountdown(prev => (prev !== null ? prev - 1 : null)), 1000);
    return () => clearTimeout(timer);
  }, [countdown, navigate]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleBackStep = () => {
    setStep(1);
    setVerificationCode("");
    setMessage("");
  };

  const handleNextStep = async (e: FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setMessage("");
    setLoading(true);
    const validationErrors = validateRegister(form);
    if (validationErrors.length > 0) { setErrors(validationErrors); setLoading(false); return; }
    setStep(2);
    setLoading(false);
  };

  const handleSendCode = async () => {
    if (sendCooldown > 0 || sendCount >= MAX_SENDS) return;
    setErrors([]);
    setMessage("");
    setLoading(true);
    try {
      await api.post("api/auth/send-code", { email: form.email });
      setMessage("Verification code sent to your email.");
      setSendCooldown(COOLDOWN_TIME);
      setSendCount(prev => prev + 1);
    } catch {
      setErrors(["Failed to send verification code."]);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setMessage("");
    setLoading(true);
    try {
      await api.post("api/auth/register", {
        email:             form.email,
        password:          form.password,
        first_name:        form.firstName,
        middle_name:       form.middleName || null,
        last_name:         form.lastName,
        phone_number:      form.phoneNumber || null,
        verification_code: verificationCode,
      });
      setMessage("Account created successfully. Redirecting...");
      setCountdown(3);
    } catch (err: any) {
      setErrors([err.response?.data?.detail ?? "Verification failed."]);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 6) setVerificationCode(value);
  };

  const maskEmail = (email: string) => {
    const [name, domain] = email.split("@");
    if (!name || !domain) return email;
    if (name.length <= 2) return name[0] + "*@" + domain;
    return `${name[0]}${"*".repeat(name.length - 2)}${name[name.length - 1]}@${domain}`;
  };

  const isCodeValid = verificationCode.length === 6;

  return (
    <>
      <title>TransacScope — Create Account</title>

      <style>{`
        ${buildAuthStyles("reg-root", "reg-card", 460, true)}

        /* ── Register-only: step indicator ── */
        .step-indicator { display: flex; align-items: center; gap: 0; margin-bottom: 2rem; }
        .step-dot {
          display: flex; align-items: center; justify-content: center;
          width: 28px; height: 28px; border-radius: 50%;
          font-size: 12px; font-weight: 700;
          transition: background 0.25s, color 0.25s, border-color 0.25s;
        }
        .step-dot.active   { background: ${S.primary}; color: hsl(220,28%,7%); border: none; }
        .step-dot.done     { background: hsl(199 89% 48% / 0.15); color: ${S.primary}; border: 1px solid hsl(199 89% 48% / 0.35); }
        .step-dot.inactive { background: ${S.accent}; color: ${S.muted}; border: 1px solid ${S.border}; }
        .step-connector    { flex: 1; height: 1px; margin: 0 6px; transition: background 0.25s; }
        .step-connector.done     { background: ${S.primary}; opacity: 0.35; }
        .step-connector.inactive { background: ${S.border}; }
        .step-labels { display: flex; justify-content: space-between; margin-top: 6px; margin-bottom: 2rem; }
        .step-label-item { font-size: 10px; letter-spacing: 0.05em; text-transform: uppercase; font-weight: 600; flex: 1; text-align: center; }
        .step-label-item:first-child { text-align: left; }
        .step-label-item:last-child  { text-align: right; }

        /* ── Register-only: field grid ── */
        .field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
        .field-grid .field-wrap.full { grid-column: 1 / -1; }
        .required-star  { color: ${S.expense}; font-size: 10px; }
        .optional-tag   { font-size: 9.5px; color: hsl(220,10%,36%); font-weight: 500; letter-spacing: 0.03em; text-transform: none; font-style: italic; }

        /* ── Register-only: verify step ── */
        .countdown-box {
          background: hsl(199 89% 48% / 0.08); border: 1px solid hsl(199 89% 48% / 0.2);
          border-radius: 10px; padding: 8px 14px; margin-bottom: 1rem;
          font-size: 12.5px; color: ${S.primary}; text-align: center;
          font-family: 'DM Mono', monospace;
        }
        .email-badge {
          background: ${S.accent}; border: 1px solid ${S.border}; border-radius: 8px;
          padding: 10px 14px; margin-bottom: 1.25rem;
          font-size: 12.5px; color: ${S.muted};
        }
        .email-badge strong { color: ${S.primary}; font-family: 'DM Mono', monospace; font-weight: 500; }
        .code-input {
          width: 100%; background: ${S.accent}; border: 1px solid ${S.border};
          border-radius: 10px; padding: 14px;
          font-family: 'DM Mono', monospace; font-size: 22px; font-weight: 600;
          color: ${S.accentFg}; letter-spacing: 0.35em; text-align: center;
          outline: none; transition: border-color 0.2s, box-shadow 0.2s; margin-bottom: 0.75rem;
        }
        .code-input::placeholder { color: hsl(220,10%,28%); letter-spacing: 0.2em; font-size: 18px; }
        .code-input:focus { border-color: ${S.primary}; box-shadow: 0 0 0 3px hsl(199 89% 48% / 0.12); }
        .code-input.valid { border-color: hsl(160 60% 45% / 0.5); }
        .send-btn {
          width: 100%; padding: 11px 20px; border-radius: 10px;
          border: 1px solid hsl(199 89% 48% / 0.3);
          font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
          color: ${S.primary}; background: hsl(199 89% 48% / 0.08);
          cursor: pointer; transition: background 0.15s, border-color 0.15s, opacity 0.15s;
        }
        .send-btn:hover:not(:disabled) { background: hsl(199 89% 48% / 0.14); border-color: hsl(199 89% 48% / 0.5); }
        .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .ghost-btn {
          background: transparent; border: 1px solid ${S.border}; border-radius: 10px;
          padding: 11px 20px; font-family: 'DM Sans', sans-serif;
          font-size: 14px; font-weight: 500; color: ${S.muted};
          cursor: pointer; transition: border-color 0.15s, color 0.15s, background 0.15s; width: 100%;
        }
        .ghost-btn:hover:not(:disabled) { border-color: hsl(220,20%,28%); color: ${S.foreground}; background: ${S.accent}; }
        .ghost-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .spinner-muted {
          width: 13px; height: 13px;
          border: 2px solid hsl(199 89% 48% / 0.25); border-top-color: ${S.primary};
          border-radius: 50%; animation: spin 0.7s linear infinite;
        }
        .btn-row { display: flex; gap: 0.75rem; margin-top: 1.5rem; }
        .limit-warning {
          font-size: 11.5px; color: ${S.expense};
          background: hsl(0 72% 51% / 0.06); border: 1px solid hsl(0 72% 51% / 0.2);
          border-radius: 8px; padding: 8px 12px; margin-top: 0.5rem; text-align: center;
        }
      `}</style>

      <div className="reg-root">

        {particles.map(p => (
          <span
            key={p.id}
            className="particle"
            style={{ left: `${p.x}%`, color: p.color, opacity: p.opacity, fontSize: `${p.fontSize}px`, animationDuration: `${p.duration}s` }}
          >
            {p.label}
          </span>
        ))}

        <div className={`reg-card${mounted ? " mounted" : ""}`}>

          {/* Logo */}
          <div className="logo-row" style={{ justifyContent: "flex-start" }}>
            <img src="/transacScope1.svg" alt="TransacScope" style={{ height: "100px", width: "auto" }} />
          </div>

          {/* Step indicator */}
          <div className="step-indicator">
            <div className={`step-dot ${step === 1 ? "active" : "done"}`}>{step > 1 ? "✓" : "1"}</div>
            <div className={`step-connector ${step > 1 ? "done" : "inactive"}`} />
            <div className={`step-dot ${step === 2 ? "active" : "inactive"}`}>2</div>
          </div>
          <div className="step-labels">
            <span className="step-label-item" style={{ color: step === 1 ? S.primary : S.muted }}>Your Details</span>
            <span className="step-label-item" style={{ color: step === 2 ? S.primary : S.muted }}>Verify Email</span>
          </div>

          {/* Heading */}
          <h1 className="card-title">
            {step === 1 ? "Create an account" : "Verify your email"}
          </h1>
          <p className="card-subtitle">
            {step === 1 ? "Fill in your details to get started" : "One last step — confirm your email address"}
          </p>
          <div className="accent-line" />

          {/* Feedback */}
          {errors.length > 0 && (
            <div className="error-box">
              {errors.map((err, i) => <p key={i}>⚠ {err}</p>)}
            </div>
          )}
          {message && (
            <div className="success-box"><p>✓ {message}</p></div>
          )}
          {countdown !== null && countdown > 0 && (
            <div className="countdown-box">Redirecting to login in {countdown}s…</div>
          )}

          {/* ── Step 1: details form ── */}
          {step === 1 && (
            <form onSubmit={handleNextStep}>
              <div className="field-grid">
                {[
                  { name: "firstName",   label: "First Name",   placeholder: "Juan",           required: true,  maxLength: 50  },
                  { name: "middleName",  label: "Middle Name",  placeholder: "Santos",          required: false, maxLength: 50  },
                  { name: "lastName",    label: "Last Name",    placeholder: "Dela Cruz",        required: true,  maxLength: 50  },
                  { name: "phoneNumber", label: "Phone",        placeholder: "09XXXXXXXXX",      required: false, maxLength: 11  },
                ].map(({ name, label, placeholder, required, maxLength }) => (
                  <div key={name} className="field-wrap">
                    <label className="field-label">
                      {label}{" "}
                      {required
                        ? <span className="required-star">*</span>
                        : <span className="optional-tag">optional</span>
                      }
                    </label>
                    <input
                      className="field-input"
                      type="text"
                      name={name}
                      value={(form as any)[name]}
                      onChange={handleChange}
                      placeholder={placeholder}
                      maxLength={maxLength}
                      required={required}
                    />
                  </div>
                ))}

                <div className="field-wrap full">
                  <label className="field-label">Email <span className="required-star">*</span></label>
                  <input
                    className="field-input" type="email" name="email"
                    value={form.email} onChange={handleChange}
                    placeholder="juan@example.com" required
                  />
                </div>

                <div className="field-wrap full">
                  <label className="field-label">Password <span className="required-star">*</span></label>
                  <input
                    className="field-input" type="password" name="password"
                    value={form.password} onChange={handleChange}
                    placeholder="Create a strong password" maxLength={72} required
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
                Already have an account? <Link to="/login">Sign in</Link>
              </p>
            </form>
          )}

          {/* ── Step 2: verify email ── */}
          {step === 2 && (
            <form onSubmit={handleVerifyCode}>
              <div className="email-badge">
                {sendCount === 0
                  ? <>Code will be sent to <strong>{maskEmail(form.email)}</strong></>
                  : <>Enter the 6-digit code sent to <strong>{maskEmail(form.email)}</strong></>
                }
              </div>

              <div className="field-wrap" style={{ marginBottom: "1rem" }}>
                <label className="field-label">Verification Code</label>
                <input
                  className={`code-input${isCodeValid ? " valid" : ""}`}
                  type="text" inputMode="numeric" pattern="\d*"
                  value={verificationCode} onChange={handleCodeChange}
                  placeholder="· · · · · ·" maxLength={6}
                />
              </div>

              <button
                type="button" className="send-btn"
                onClick={handleSendCode}
                disabled={loading || sendCooldown > 0 || sendCount >= MAX_SENDS}
              >
                <span className="btn-inner">
                  {loading && sendCount === 0 && <span className="spinner-muted" />}
                  {loading && sendCount === 0
                    ? "Sending…"
                    : sendCooldown > 0        ? `Resend in ${sendCooldown}s`
                    : sendCount >= MAX_SENDS  ? "Send Limit Reached"
                    : sendCount === 0         ? "Send Code"
                    :                           "Resend Code"
                  }
                </span>
              </button>

              {sendCount >= MAX_SENDS && (
                <p className="limit-warning">
                  ⚠ Maximum verification attempts reached. Please try again later.
                </p>
              )}

              <div className="btn-row">
                <button
                  type="button" className="ghost-btn"
                  onClick={handleBackStep} disabled={loading}
                  style={{ flex: "0 0 auto", width: "auto", padding: "12px 20px" }}
                >
                  ← Back
                </button>
                <button
                  className="submit-btn" type="submit"
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
  );
}