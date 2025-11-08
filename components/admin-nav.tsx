"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"

export default function AdminNav() {
  const { logout } = useAuth()

  const handleLogout = () => {
    logout()
    window.location.href = "/admin/login"
  }

  return (
    <nav className="bg-card border-b border-border px-8 py-4 flex items-center justify-between">
      <Link href="/admin/dashboard" className="text-xl font-bold text-primary">
        RaffleHub Admin
      </Link>
      <Button
        variant="outline"
        onClick={handleLogout}
        className="border-primary text-primary hover:bg-primary hover:text-primary-foreground bg-transparent"
      >
        Cerrar Sesión
      </Button>
    </nav>
  )
}
