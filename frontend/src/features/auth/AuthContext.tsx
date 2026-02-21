// src/contexts/AuthContext.tsx
import { createContext, useState, useEffect } from "react"
import type { ReactNode } from "react"

import { setLogoutCallback } from "../../services/apiClient"

// Define the User type based on your database
interface User {
  id: number
  first_name: string
  middle_name?: string | null
  last_name: string
  email: string
  phone_number?: string | null
  role_id: number
  is_active: boolean
  created_at: string
}

interface AuthContextType {
  isLoggedIn: boolean
  user: User | null
  setLoggedIn: (val: boolean) => void
  setUser: (user: User | null) => void
  logout: () => void
}

// Default context values
export const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  user: null,
  setLoggedIn: (_val: boolean) => {},
  setUser: (_user: User | null) => {},
  logout: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  // Load token and user info from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user")
    if (storedUser) {
      setUser(JSON.parse(storedUser))
      setIsLoggedIn(true)
    }
  }, [])

  const logout = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("token_type")
    setIsLoggedIn(false)
    setUser(null)
  }

  useEffect(() => {
    setLogoutCallback(logout)
  }, [logout])

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        user,
        setLoggedIn: setIsLoggedIn,
        setUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}