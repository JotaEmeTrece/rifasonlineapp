"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { authApi } from "@/lib/api-helpers"

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Check if user is authenticated on mount
  useEffect(() => {
    const token = localStorage.getItem("adminToken")
    if (!token) {
      setIsAuthenticated(false)
      setIsLoading(false)
      return
    }

    authApi
      .me()
      .then(() => {
        setIsAuthenticated(true)
      })
      .catch(() => {
        localStorage.removeItem("adminToken")
        setIsAuthenticated(false)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login(email, password)
      const { token } = response.data
      localStorage.setItem("adminToken", token)
      setIsAuthenticated(true)
    } catch (error) {
      setIsAuthenticated(false)
      throw error
    }
  }

  const logout = () => {
    authApi.logout()
    setIsAuthenticated(false)
  }

  return <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
