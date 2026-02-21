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
    if (error.response?.status === 401) {
      logoutCallback()
    }
    return Promise.reject(error)
  }
)

export default api