// src/services/apiClient.ts
import axios from "axios"

let logoutCallback: () => void = () => {}

export const setLogoutCallback = (cb: () => void) => {
  logoutCallback = cb
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/",
})

api.interceptors.request.use((config) => {
  const token     = localStorage.getItem("access_token");
  const tokenType = localStorage.getItem("token_type");
  if (token && tokenType) {
    config.headers.Authorization = `${tokenType} ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    // 401 = token expired / unauthorized
    // 420 = your custom status (keep it if your backend uses it)
    if (status === 401 || status === 420) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("token_type");
      logoutCallback();
    }

    return Promise.reject(error);
  }
);

export default api