"use client"

import { useState, useEffect } from "react"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import RaffleGrid from "@/components/raffle-grid"

export default function RafflesPage() {
  const [raffles, setRaffles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
        {
          id: 5,
          title: "iPhone 15 Pro",
          description: "Último modelo de iPhone con tecnología 5G",
          image: "/iphone-15-pro-luxury.jpg",
          price: 60,
          numbers_total: 600,
          numbers_sold: 289,
          prize_value: 12000,
        },
        {
          id: 6,
          title: "Reloj Suizo",
          description: "Reloj de lujo suizo con diamantes",
          image: "/swiss-watch-diamond-luxury.jpg",
          price: 80,
          numbers_total: 400,
          numbers_sold: 178,
          prize_value: 18000,
        },
      ])
      setLoading(false)
    }, 500)
  }, [])

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-12 text-primary">Todas las Rifas</h1>
          <RaffleGrid raffles={raffles} loading={loading} />
        </div>
      </main>

      <Footer />
    </div>
  )
}
