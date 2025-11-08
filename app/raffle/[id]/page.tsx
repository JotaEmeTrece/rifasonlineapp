"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import NumberGrid from "@/components/number-grid"

export default function RafflePage() {
  const params = useParams()
  const [raffle, setRaffle] = useState<any>(null)
  const [selectedNumbers, setSelectedNumbers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setTimeout(() => {
      setRaffle({
        id: params.id,
        title: "Viaje a Cancún",
        description: "Viaje todo incluido para 2 personas a Cancún, Quintana Roo",
        image: "/cancun-beach-resort.png",
        price: 50,
        numbers_total: 1000,
        numbers_sold: 342,
        prize_value: 15000,
        start_date: "2025-01-15",
        end_date: "2025-02-15",
        draw_date: "2025-02-20",
        details: "Incluye: vuelo redondo, 5 noches de hotel 5 estrellas, desayuno incluido, tours y actividades.",
      })
      setLoading(false)
    }, 500)
  }, [params.id])

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="bg-card rounded-lg h-96 animate-pulse border border-border" />
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!raffle) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 py-20 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-2xl font-bold text-destructive">Rifa no encontrada</h1>
            <Button asChild className="mt-4">
              <Link href="/raffles">Volver a Rifas</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const progress = (raffle.numbers_sold / raffle.numbers_total) * 100
  const totalPrice = selectedNumbers.length * raffle.price

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <Button variant="ghost" asChild className="mb-6">
            <Link href="/raffles">← Volver a Rifas</Link>
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Raffle Info */}
            <div className="lg:col-span-2">
              <Card className="overflow-hidden">
                <img src={raffle.image || "/placeholder.svg"} alt={raffle.title} className="w-full h-96 object-cover" />
              </Card>

              <div className="mt-8">
                <h1 className="text-4xl font-bold mb-4 text-primary">{raffle.title}</h1>
                <p className="text-lg text-muted-foreground mb-6">{raffle.description}</p>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <Card className="p-4 bg-secondary/50 border-border">
                    <p className="text-sm text-muted-foreground mb-1">Premio</p>
                    <p className="text-2xl font-bold text-primary">${raffle.prize_value.toLocaleString()}</p>
                  </Card>
                  <Card className="p-4 bg-secondary/50 border-border">
                    <p className="text-sm text-muted-foreground mb-1">Precio por Número</p>
                    <p className="text-2xl font-bold text-primary">${raffle.price}</p>
                  </Card>
                </div>

                <div className="mb-8">
                  <h3 className="font-bold text-lg mb-3">Progreso de Venta</h3>
                  <div className="w-full bg-secondary rounded-full h-4 overflow-hidden mb-2">
                    <div className="bg-primary h-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {raffle.numbers_sold} de {raffle.numbers_total} números vendidos ({progress.toFixed(1)}%)
                  </p>
                </div>

                <div className="bg-card border border-border rounded-lg p-6 mb-8">
                  <h3 className="font-bold text-lg mb-3">Detalles del Premio</h3>
                  <p className="text-muted-foreground">{raffle.details}</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Inicio de Venta</p>
                    <p className="font-bold">{new Date(raffle.start_date).toLocaleDateString("es-ES")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cierre de Venta</p>
                    <p className="font-bold">{new Date(raffle.end_date).toLocaleDateString("es-ES")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fecha de Sorteo</p>
                    <p className="font-bold">{new Date(raffle.draw_date).toLocaleDateString("es-ES")}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Selection & Cart */}
            <div>
              <Card className="sticky top-24 p-6 border-primary">
                <h3 className="font-bold text-lg mb-4 text-primary">Selecciona tus Números</h3>

                <NumberGrid
                  total={raffle.numbers_total}
                  selected={selectedNumbers}
                  onSelect={setSelectedNumbers}
                  soldNumbers={[]}
                />

                <div className="mt-6 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Números seleccionados:</span>
                    <span className="font-bold">{selectedNumbers.length}</span>
                  </div>
                  <div className="flex justify-between text-lg border-t border-border pt-3">
                    <span className="font-bold">Total:</span>
                    <span className="text-primary font-bold text-xl">${totalPrice}</span>
                  </div>
                </div>

                <Button
                  disabled={selectedNumbers.length === 0}
                  className="w-full mt-6 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Comprar ({selectedNumbers.length})
                </Button>

                <p className="text-xs text-muted-foreground text-center mt-4">
                  Los números se asignarán al azar si no los especificas
                </p>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
