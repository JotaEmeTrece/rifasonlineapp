"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import Navbar from "@/components/navbar"
import RaffleGrid from "@/components/raffle-grid"
import Footer from "@/components/footer"
import { raffleApi } from "@/lib/api-helpers"

export default function Home() {
  const [raffles, setRaffles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRaffles = async () => {
      try {
        const { data } = await raffleApi.getRaffles()
        const mapped = (data?.data || []).map((r: any) => ({
          id: r.id,
          title: r.nombre,
          description: r.fecha_sorteo ? `Sorteo: ${r.fecha_sorteo}` : "Rifa disponible",
          image: r.image_url || "/placeholder.svg",
          price: Number(r.precio_numero) || 0,
          numbers_total: Number(r.rango_maximo) || 0,
          numbers_sold: 0,
          prize_value: 0,
        }))
        setRaffles(mapped)
      } catch (err) {
        setRaffles([])
      } finally {
        setLoading(false)
      }
    }
    fetchRaffles()
  }, [])

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-card to-background py-20 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-5xl font-bold text-balance mb-6 text-primary">Tu Plataforma de Rifas Online</h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Participa en rifas premium con transparencia y seguridad. Grandes premios, pequeños precios.
            </p>
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
              Ver Rifas Disponibles
            </Button>
          </div>
        </section>

        {/* Raffles Grid */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold mb-12 text-primary">Rifas Activas</h2>
            <RaffleGrid raffles={raffles} loading={loading} />
          </div>
        </section>

        {/* Stats Section */}
        <section className="bg-card py-16 px-4 border-y border-border">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">2,450</div>
                <p className="text-muted-foreground">Ganadores Pagados</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">$2.5M</div>
                <p className="text-muted-foreground">Distribuido en Premios</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">18,230</div>
                <p className="text-muted-foreground">Clientes Activos</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
