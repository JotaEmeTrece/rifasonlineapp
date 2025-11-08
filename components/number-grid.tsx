"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"

interface NumberGridProps {
  total: number
  selected: string[]
  onSelect: (numbers: string[]) => void
  soldNumbers: string[]
}

export default function NumberGrid({ total, selected, onSelect, soldNumbers }: NumberGridProps) {
  const [searchNumber, setSearchNumber] = useState("")

  const numDigits = total.toString().length
  const formatNumber = (num: number): string => num.toString().padStart(numDigits, "0")

  const handleToggle = (num: string) => {
    if (selected.includes(num)) {
      onSelect(selected.filter((n) => n !== num))
    } else {
      onSelect([...selected, num])
    }
  }

  const handleSelectRandom = () => {
    const allNumbers = Array.from({ length: total }, (_, i) => formatNumber(i))
    const available = allNumbers.filter((n) => !soldNumbers.includes(n))

    if (available.length === 0) return

    const count = Math.min(10, available.length)
    const random = []
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * available.length)
      random.push(available[idx])
      available.splice(idx, 1)
    }
    onSelect(random)
  }

  const allNumbers = Array.from({ length: total }, (_, i) => formatNumber(i))
  const filteredNumbers = allNumbers.filter((num) => {
    if (!searchNumber) return true
    return num.includes(searchNumber)
  })

  const cols = total <= 100 ? 10 : 20
  const gridClass = total <= 100 ? "grid-cols-10" : "grid-cols-20"

  return (
    <div className="space-y-4">
      <Input
        type="text"
        placeholder="Buscar número específico..."
        value={searchNumber}
        onChange={(e) => setSearchNumber(e.target.value)}
        className="w-full"
      />

      <button
        onClick={handleSelectRandom}
        className="w-full px-3 py-2 text-sm border border-primary text-primary rounded hover:bg-primary/10 transition"
      >
        Seleccionar al Azar (10)
      </button>

      <div className={`grid gap-1 ${gridClass}`}>
        {filteredNumbers.map((num) => (
          <button
            key={num}
            onClick={() => handleToggle(num)}
            className={`aspect-square text-xs font-bold rounded transition ${
              selected.includes(num)
                ? "bg-primary text-primary-foreground"
                : soldNumbers.includes(num)
                  ? "bg-secondary text-muted-foreground cursor-not-allowed"
                  : "bg-secondary text-foreground hover:bg-primary/20"
            }`}
            disabled={soldNumbers.includes(num)}
          >
            {num}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {selected.length} de {total} números disponibles
      </p>
    </div>
  )
}
