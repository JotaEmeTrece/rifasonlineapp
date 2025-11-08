import axios from "axios"

// Create axios instance for backend API calls
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api",
  headers: {
    "Content-Type": "application/json",
  },
})

// Add token to requests if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("adminToken")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle response errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("adminToken")
      window.location.href = "/admin/login"
    }
    return Promise.reject(error)
  },
)
