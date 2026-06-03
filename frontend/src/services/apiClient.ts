// src/services/apiClient.ts
import axios from "axios"

let logoutCallback: () => void = () => {}
let rateLimitCallback: () => void = () => {}

export const setLogoutCallback = (cb: () => void) => {
  logoutCallback = cb
}

export const setRateLimitCallback = (cb: () => void) => {
  rateLimitCallback = cb
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
    const requestUrl = error.config?.url ?? "";

    // wrong credentials also return 401 and should be handled by the caller
    const isAuthEndpoint =
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/register");

    if ((status === 401 || status === 420) && !isAuthEndpoint) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("token_type");
      alert("Session expired. Please log in again.");
      logoutCallback();
    }

    if (status === 429) {
      rateLimitCallback();
    }

    return Promise.reject(error);
  }
);

export default api