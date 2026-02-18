// src/pages/auth/Login.tsx
import { useState, useContext } from "react"
//import { useNavigate } from "react-router-dom"
import { validateLogin } from "../../schemas/login"
import type { LoginForm } from "../../schemas/login"
import axios from "axios"
import { AuthContext } from "../../contexts/AuthContext"
import { Link } from "react-router-dom"

export default function Login() {
  //const navigate = useNavigate()
  const { setLoggedIn } = useContext(AuthContext)

  const [form, setForm] = useState<LoginForm>({ email: "", password: "" })
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors([])
    setMessage("")

    const validationErrors = validateLogin(form)
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    setLoading(true)
    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/api/auth/login",
        form
      )

      const { access_token, token_type } = response.data

      // Store token
      localStorage.setItem("access_token", access_token)
      localStorage.setItem("token_type", token_type)

      // Update global auth state
      setLoggedIn(true)

    } catch (err: any) {
      if (err.response?.status === 401) {
        setErrors(["Invalid credentials or inactive account"])
      } else {
        setErrors(["Login failed. Try again later."])
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="">
      <title>App - log in or sign up</title>
      <h1>Login</h1>

      {errors.length > 0 && (
        <div className="">
          {errors.map((err, i) => (
            <p key={i}>{err}</p>
          ))}
        </div>
      )}

      {message && <p>{message}</p>}

      <form onSubmit={handleSubmit}>
        <div className="">
          <label>Email:</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="">
          <label>Password:</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
      {/* Link to Register */}
      <p className="">
        Don't have an account?{" "}
        <Link to="/register">Create one</Link>
      </p>
    </div>
  )
}
