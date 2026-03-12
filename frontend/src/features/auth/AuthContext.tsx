import { createContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { UserSchema } from "./schemas/userAuth";
import type { AuthContextType, User } from "./schemas/userAuth";
import api, { setLogoutCallback, setRateLimitCallback } from "../../services/apiClient";
import { toast } from "sonner";

export const AuthContext = createContext<AuthContextType>({
  isLoggedIn:         false,
  user:               null,
  passwordExpired:    false,
  setLoggedIn:        (_val: boolean) => {},
  setUser:            (_user: User | null) => {},
  setPasswordExpired: (_val: boolean) => {},
  logout:             () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn,      setIsLoggedIn]      = useState(false);
  const [user,            setUser]            = useState<User | null>(null);
  const [passwordExpired, setPasswordExpired] = useState(false);
  const [isLoading,       setIsLoading]       = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("token_type");
    localStorage.removeItem("password_expired");
    setIsLoggedIn(false);
    setUser(null);
    setPasswordExpired(false);
  }, []);

  useEffect(() => {
    const token     = localStorage.getItem("access_token");
    const tokenType = localStorage.getItem("token_type");

    if (!token || !tokenType) {
      sessionStorage.setItem("auth_loaded", "true")
      setIsLoading(false);
      return;
    }

    (async () => {
      try {
        const response   = await api.get("api/auth/me", {
          headers: { Authorization: `${tokenType} ${token}` },
        });
        const parsedUser = UserSchema.parse(response.data);
        setUser(parsedUser);
        setIsLoggedIn(true);

        // Restore passwordExpired from localStorage (set at login time)
        const storedExpired = localStorage.getItem("password_expired");
        setPasswordExpired(storedExpired === "true");
      } catch {
        logout();
      } finally {
        sessionStorage.setItem("auth_loaded", "true")
        setIsLoading(false);
      }
    })();
  }, [logout]);

  useEffect(() => {
    setLogoutCallback(logout);
    setRateLimitCallback(() => {
      toast.warning("Slow down! Too many requests — wait a moment and try again.");
    });
  }, [logout]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen cursor-wait">
        <img src="/favicon.svg" alt="App Logo" className="w-24 animate-pulse mb-4" />
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        user,
        passwordExpired,
        setLoggedIn: setIsLoggedIn,
        setUser,
        setPasswordExpired,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}