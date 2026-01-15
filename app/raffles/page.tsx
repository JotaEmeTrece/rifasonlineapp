"use client"

import { useState, useEffect } from "react"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import RaffleGrid from "@/components/raffle-grid"
import { raffleApi } from "@/lib/api-helpers"

export default function RafflesPage() {
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
          numbers_total: Number(r.numbers_total ?? r.rango_maximo) || 0,
          numbers_sold: Number(r.numbers_sold) || 0,
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
