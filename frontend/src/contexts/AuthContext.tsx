// src/contexts/AuthContext.tsx
import { createContext, useState, useEffect } from "react"

import type { ReactNode } from 'react'

interface AuthContextType {
  isLoggedIn: boolean
  setLoggedIn: (val: boolean) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  setLoggedIn: () => {}, // matches the context type
  logout: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false) // <-- correct

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    setIsLoggedIn(!!token)
  }, [])

  const logout = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("token_type")
    setIsLoggedIn(false) // <-- use the correct state setter
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn, setLoggedIn: setIsLoggedIn, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
