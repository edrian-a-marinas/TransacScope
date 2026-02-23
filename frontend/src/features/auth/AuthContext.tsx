// src/contexts/AuthContext.tsx
import { createContext, useState, useEffect, useCallback } from "react"
import type { ReactNode } from "react"
import { UserSchema } from "./schemas/userAuth"
import type { AuthContextType, User } from "./schemas/userAuth"
import api, { setLogoutCallback } from "../../services/apiClient"



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
  const [isLoading, setIsLoading] = useState(true)

  const logout = useCallback(() => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("token_type")
    setIsLoggedIn(false)
    setUser(null)
  }, [])

  // Load token and user info from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem("access_token")
    const tokenType = localStorage.getItem("token_type")

    if (!token || !tokenType) {
      return setIsLoading(false)
    }

    ;(async () => {
      try {
        const response = await api.get("api/auth/me", {
          headers: { Authorization: `${tokenType} ${token}` },
        })

        const parsedUser = UserSchema.parse(response.data)

        setUser(parsedUser)
        setIsLoggedIn(true)
      } catch {
        logout()
      } finally {
        setIsLoading(false)
      }
    })()
  }, [logout])

  useEffect(() => {
    setLogoutCallback(logout)
  }, [logout])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen cursor-wait">
        <img src="../../../../../src/assets/vite.svg" alt="App Logo" className="w-24 animate-pulse mb-4" />
      </div>
    )
  }


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