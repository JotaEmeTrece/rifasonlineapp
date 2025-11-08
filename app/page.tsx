"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import Navbar from "@/components/navbar"
import RaffleGrid from "@/components/raffle-grid"
import Footer from "@/components/footer"

export default function Home() {
  const [raffles, setRaffles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setRaffles([
        {
          id: 1,
          title: "Viaje a Cancún",
          description: "Viaje todo incluido para 2 personas a Cancún",
          image: "/cancun-beach-resort.png",
          price: 50,
          numbers_total: 1000,
          numbers_sold: 342,
          prize_value: 15000,
        },
        {
          id: 2,
          title: "Auto Deportivo",
          description: "Último modelo de auto deportivo",
          image: "/sports-car-luxury.jpg",
          price: 100,
          numbers_total: 500,
          numbers_sold: 201,
          prize_value: 50000,
        },
        {
          id: 3,
          title: "Joyería de Oro",
          description: "Collar y aretes de oro 18 quilates",
          image: "/gold-jewelry-luxury.jpg",
          price: 30,
          numbers_total: 2000,
          numbers_sold: 1500,
          prize_value: 5000,
        },
        {
          id: 4,
          title: "Laptop Premium",
          description: "Computadora portátil última generación",
          image: "/premium-laptop-computer.jpg",
          price: 75,
          numbers_total: 800,
          numbers_sold: 450,
          prize_value: 8000,
        },
      ])
      setLoading(false)
    }, 500)
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
