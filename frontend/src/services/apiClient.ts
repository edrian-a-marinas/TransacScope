// src/services/apiClient.ts
import axios from "axios"

let logoutCallback: () => void = () => {}

export const setLogoutCallback = (cb: () => void) => {
  logoutCallback = cb
}

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/",
})

api.interceptors.response.use(
  
  (response) => response,
  (error) => {
    if (error.response?.status === 420) {
      logoutCallback()
    }
    return Promise.reject(error)
  }
)

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  const tokenType = localStorage.getItem("token_type");

  if (token && tokenType) {
    config.headers.Authorization = `${tokenType} ${token}`;
  }

  return config;
});

export default api