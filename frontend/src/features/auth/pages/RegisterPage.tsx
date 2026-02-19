// src/pages/auth/Register.tsx
import { useState } from "react"
import { Link } from "react-router-dom"
import axios from "axios"

import { validateRegister } from "../schemas/register"
import type { RegisterForm } from "../schemas/register"

export default function Register() {
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setErrors([])
    setMessage("")

    const validationErrors = validateRegister(form)
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    setLoading(true)
    try {
      await axios.post("http://127.0.0.1:8000/api/auth/register", {
        email: form.email,
        password: form.password,
        first_name: form.firstName,
        middle_name: form.middleName || null,
        last_name: form.lastName,
        phone_number: form.phoneNumber,
      })

      setMessage("Account created successfully! You can now log in.")
      setForm({
        email: "",
        password: "",
        firstName: "",
        middleName: "",
        lastName: "",
        phoneNumber: "",
      })
    } catch (err: any) {
      if (err.response?.data?.detail) {
        setErrors([err.response.data.detail])
      } else {
        setErrors(["Registration failed. Try again later."])
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <title>Create Account</title>
      <h1>Sign Up</h1>

      {errors.length > 0 && (
        <div>
          {errors.map((err, i) => (
            <p key={i}>{err}</p>
          ))}
        </div>
      )}

      {message && <p>{message}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="firstName">First Name</label>
          <input
            id="firstName"
            type="text"
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
            placeholder="Enter your first name"
            maxLength={50} 
            required
            
          />
        </div>

        <div>
          <label htmlFor="middleName">Middle Name</label>
          <input
            id="middleName"
            type="text"
            name="middleName"
            value={form.middleName}
            onChange={handleChange}
            placeholder=" Optional"
            maxLength={50} 
          />
        </div>

        <div>
          <label htmlFor="lastName">Last Name</label>
          <input
            id="lastName"
            type="text"
            name="lastName"
            value={form.lastName}
            onChange={handleChange}
            placeholder="Enter your last name"
            maxLength={50} 
            required
          />
        </div>

        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Enter your email address"
            maxLength={100} 
            required
          />
        </div>

        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Create a strong password"
            maxLength={72} 
            required
          />
        </div>

        <div>
          <label htmlFor="phoneNumber">Phone Number</label>
          <input
            id="phoneNumber"
            type="text"
            name="phoneNumber"
            value={form.phoneNumber}
            onChange={handleChange}
            placeholder="09XXXXXXXXX"
            maxLength={11} 
            required
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Sign Up"}
        </button>
      </form>

      <p>
        
        <Link to="/login">Already have an account?{" "}</Link>
      </p>
    </div>
  )
}
