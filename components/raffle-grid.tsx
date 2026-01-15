"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"

interface Raffle {
  id: number
  title: string
  description: string
  image: string
  price: number
  numbers_total: number
  numbers_sold: number
  prize_value: number
}

interface RaffleGridProps {
  raffles: Raffle[]
  loading: boolean
}

export default function RaffleGrid({ raffles, loading }: RaffleGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card rounded-lg h-80 animate-pulse border border-border" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {raffles.map((raffle) => {
        const progress = (raffle.numbers_sold / raffle.numbers_total) * 100

        return (
          <Link key={raffle.id} href={`/raffle/${raffle.id}`}>
            <Card className="h-full overflow-hidden hover:shadow-lg hover:border-primary transition-all cursor-pointer group">
              <div className="relative overflow-hidden h-40 bg-secondary">
                <img
                  src={raffle.image || "/placeholder.svg"}
                  alt={raffle.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>

              <div className="p-4">
                <h3 className="font-bold text-lg mb-2 text-foreground">{raffle.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{raffle.description}</p>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Números vendidos</span>
                      <span className="text-primary font-bold">
                        {raffle.numbers_sold}/{raffle.numbers_total}
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                      <div className="bg-primary h-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-border">
                    <span className="text-2xl font-bold text-primary">${raffle.price}</span>
                    <span className="text-xs text-muted-foreground">por número</span>
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}

