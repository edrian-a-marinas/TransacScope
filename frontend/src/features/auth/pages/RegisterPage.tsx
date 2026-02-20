// src/pages/auth/Register.tsx
import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import axios from "axios"

import { validateRegister } from "../schemas/register"
import type { RegisterForm } from "../schemas/register"

export default function Register() {

  const maskEmail = (email: string) => {
    const [name, domain] = email.split("@")
    if (!name || !domain) return email

    if (name.length <= 2) {
      return name[0] + "*@" + domain
    }

    const firstChar = name[0]
    const lastChar = name[name.length - 1]
    const maskedPart = "*".repeat(name.length - 2)

    return `${firstChar}${maskedPart}${lastChar}@${domain}`
  }

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
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [countdown, setCountdown] = useState<number | null>(null)
  const [sendCooldown, setSendCooldown] = useState(0)  // seconds remaining
  const [sendCount, setSendCount] = useState(0)
  const MAX_SENDS = 3
  const COOLDOWN_TIME = 60  // 60 seconds cooldown

  useEffect(() => {
    if (sendCooldown <= 0) return
    const timer = setTimeout(() => setSendCooldown(prev => prev - 1), 1000)
    return () => clearTimeout(timer)
  }, [sendCooldown])

  useEffect(() => {
    if (countdown === null) return

    if (countdown === 0) {
      navigate("/login")
      return
    }

    const timer = setTimeout(() => {
      setCountdown(prev => (prev !== null ? prev - 1 : null))
    }, 1000)

    return () => clearTimeout(timer)
  }, [countdown, navigate])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleBackStep = () => {
    setStep(1)
    setVerificationCode("")
    setMessage("")
  }

  const handleNextStep = async (e: React.FormEvent) => {
    e.preventDefault()
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

  // STEP 2: Send verification code
  const handleSendCode = async () => {
    if (sendCooldown > 0 || sendCount >= MAX_SENDS) return
    setErrors([])
    setMessage("")
    setLoading(true)

    try {
      await axios.post("http://127.0.0.1:8000/api/auth/send-code", {
        email: form.email,
      })

      setMessage("Verification code sent to your email.")
      setSendCooldown(COOLDOWN_TIME)
      setSendCount(prev => prev + 1)

    } catch {
      setErrors(["Failed to send verification code."])
    } finally {
      setLoading(false)
    }
  }


  // Final verification
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors([])
    setMessage("")
    setLoading(true)

    try {
      await axios.post("http://127.0.0.1:8000/api/auth/register", {
        email: form.email,
        password: form.password,
        first_name: form.firstName,
        middle_name: form.middleName || null,
        last_name: form.lastName,
        phone_number: form.phoneNumber || null,
        verification_code: verificationCode,
      })

      setMessage("Account created successfully. Redirecting...")
      setCountdown(3)

    } catch (err: any) {
      if (err.response?.data?.detail) {
        setErrors([err.response.data.detail])
      } else {
        setErrors(["Verification failed."])
      }
    } finally {
      setLoading(false)
    }
  }

  // Only allow numeric 6-digit input
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "")
    if (value.length <= 6) setVerificationCode(value)
  }

  const isCodeValid = verificationCode.length === 6

  function RequiredStar() {
    return <span>* </span>
  }

  return (
    <div>
      <title>Create Account</title>
      <h1>Sign Up</h1>
      <p>
        Join and experience users tracking their business transactions.
        Let's get started with a secure account.
      </p>

      {errors.length > 0 &&
        errors.map((err, i) => <p key={i}>{err}</p>)}

      {message && <p>{message}</p>}

      {countdown !== null && countdown > 0 && (
        <p>Redirecting in {countdown}...</p>
      )}

      {step === 1 && (
        <form onSubmit={handleNextStep}>
          <div>
            <label>First Name <RequiredStar /></label>
            <input
              type="text"
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              placeholder="John"
              maxLength={50}
              required
            />
          </div>

          <div>
            <label>Middle Name</label>
            <input
              type="text"
              name="middleName"
              value={form.middleName}
              onChange={handleChange}
              placeholder="Doe"
              maxLength={50}
            />
          </div>

          <div>
            <label>Last Name <RequiredStar /></label>
            <input
              type="text"
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              placeholder="Miller"
              maxLength={50}
              required
            />
          </div>

          <div>
            <label>Phone Number</label>
            <input
              type="text"
              name="phoneNumber"
              value={form.phoneNumber}
              onChange={handleChange}
              placeholder="09XXXXXXXXX"
              maxLength={11}
            />
          </div>

          <div>
            <label>Email <RequiredStar /></label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label>Password <RequiredStar /></label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Create a strong password"
              maxLength={72}
              required
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Checking..." : "Next Step"}
          </button>

          <p>
            <Link to="/login">Already have an account?</Link>
          </p>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleVerifyCode}>
          <div>
            <p>
              Enter the OTP sent to <strong>{maskEmail(form.email)}</strong>
            </p>
            <input
              type="text"
              inputMode="numeric"
              pattern="\d*"
              value={verificationCode}
              onChange={handleCodeChange}
              placeholder="1 2 3 4 5 6"
              maxLength={6}
            />

            <button
              type="button"
              onClick={handleSendCode}
              disabled={loading || sendCooldown > 0 || sendCount >= MAX_SENDS}
            >
              {loading
                ? "Sending..."
                : sendCooldown > 0
                ? `Resend in ${sendCooldown}s`
                : sendCount >= MAX_SENDS
                ? "Send Limit Reached"
                : "Send Code"}
            </button>
            {sendCount >= MAX_SENDS && (
              <p>You have reached the maximum number of verification attempts. Try again later.</p>
            )}
          </div>

          <button type="button" onClick={handleBackStep} disabled={loading}>
            Back
          </button>

          <button
            type="submit"
            disabled={!isCodeValid || loading}
          >
            {loading ? "Verifying..." : "Verify & Create Account"}
          </button>
        </form>
      )}

    </div>
  )
}
