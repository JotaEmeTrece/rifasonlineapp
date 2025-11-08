"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-primary">
          Rifas Online
        </Link>

        <div className="hidden md:flex gap-8 items-center">
          <Link href="/" className="text-foreground hover:text-primary transition">
            Inicio
          </Link>
          <Link href="/raffles" className="text-foreground hover:text-primary transition">
            Rifas
          </Link>
          <Button
            variant="outline"
            asChild
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground bg-transparent"
          >
            <Link href="/admin/login">Admin</Link>
          </Button>
        </div>

        <button className="md:hidden p-2 hover:bg-secondary rounded transition" onClick={() => setIsOpen(!isOpen)}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="md:hidden border-t border-border p-4 flex flex-col gap-4">
          <Link href="/" className="text-foreground hover:text-primary transition">
            Inicio
          </Link>
          <Link href="/raffles" className="text-foreground hover:text-primary transition">
            Rifas
          </Link>
          <Button variant="outline" asChild className="w-full border-primary text-primary bg-transparent">
            <Link href="/admin/login">Admin</Link>
          </Button>
        </div>
      )}
    </nav>
  )
}
