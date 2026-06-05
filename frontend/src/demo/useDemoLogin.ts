import { useContext } from "react";
import { UserSchema } from "../features/auth/schemas/userAuth";
import api from "../services/apiClient";
import { AuthContext } from "../features/auth/AuthContext";

function clearLockout() {
  localStorage.removeItem("login_lockout");
}

export function useDemoLogin(
  setLoading: (v: boolean) => void,
  setErrors:  (v: string[]) => void,
  loading:    boolean,
  isLocked:   boolean,
) {
  const { setLoggedIn, setUser, setPasswordExpired } = useContext(AuthContext);

  return () => {
    if (loading || isLocked) return;
    setErrors([]);
    setLoading(true);
    api.post("api/auth/login", { email: "test.standard@gmail.com", password: "test4444" })
      .then(response => {
        const { access_token, token_type, user, password_expired } = response.data;
        const parsedUser = UserSchema.parse(user);
        localStorage.setItem("access_token", access_token);
        localStorage.setItem("token_type", token_type);
        localStorage.setItem("password_expired", String(password_expired ?? false));
        clearLockout();
        setLoggedIn(true);
        setUser(parsedUser);
        setPasswordExpired(password_expired ?? false);
      })
    .catch(err => {
        if (err?.response?.status === 429) {
            setErrors(["Too many attempts — please wait a few minutes before trying the demo again."]);
        } else {
            setErrors([err?.response ? "Demo login failed. Try again." : "Cannot connect to server."]);
        }
    })
    .finally(() => setLoading(false));
  };
}
