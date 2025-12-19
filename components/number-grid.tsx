"use client"

import type React from "react"
import { useCallback, useMemo, useState } from "react"
import { Grid, type CellComponentProps } from "react-window"
import { Input } from "@/components/ui/input"

interface NumberGridProps {
  total: number
  selected: string[]
  onSelect: (numbers: string[]) => void
  soldNumbers: string[]
}

export default function NumberGrid({ total, selected, onSelect, soldNumbers }: NumberGridProps) {
  const [searchNumber, setSearchNumber] = useState("")

  const numDigits = useMemo(() => total.toString().length, [total])
  const formatNumber = useCallback((num: number): string => num.toString().padStart(numDigits, "0"), [numDigits])

  const handleToggle = useCallback(
    (num: string) => {
      if (selected.includes(num)) {
        onSelect(selected.filter((n) => n !== num))
      } else {
        onSelect([...selected, num])
      }
    },
    [onSelect, selected],
  )

  const handleSelectRandom = useCallback(() => {
    const allNumbers = Array.from({ length: total }, (_, i) => formatNumber(i))
    const available = allNumbers.filter((n) => !soldNumbers.includes(n))

    if (available.length === 0) return

    const count = Math.min(10, available.length)
    const random: string[] = []
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * available.length)
      random.push(available[idx])
      available.splice(idx, 1)
    }
    onSelect(random)
  }, [formatNumber, onSelect, soldNumbers, total])

  const allNumbers = useMemo(() => Array.from({ length: total }, (_, i) => formatNumber(i)), [total, formatNumber])

  const filteredNumbers = useMemo(() => {
    if (!searchNumber) return allNumbers
    return allNumbers.filter((num) => num.includes(searchNumber))
  }, [allNumbers, searchNumber])

  const cols = total <= 100 ? 10 : 20
  const cellSize = total <= 100 ? 40 : 32
  const rowCount = Math.ceil(filteredNumbers.length / cols)

  const Cell = ({ columnIndex, rowIndex, style }: CellComponentProps) => {
    const idx = rowIndex * cols + columnIndex
    const num = filteredNumbers[idx]
    if (!num) return <div style={style} />

    const isSelected = selected.includes(num)
    const isSold = soldNumbers.includes(num)

    return (
      <button
        style={{
          ...style,
          padding: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: cellSize,
          width: cellSize,
        }}
        onClick={() => handleToggle(num)}
        className={`text-xs font-bold rounded transition ${
          isSelected
            ? "bg-primary text-primary-foreground"
            : isSold
              ? "bg-secondary text-muted-foreground cursor-not-allowed"
              : "bg-secondary text-foreground hover:bg-primary/20"
        }`}
        disabled={isSold}
      >
        {num}
      </button>
    )
  }

  const gridWidth = cols * (cellSize + 8)

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

      <div className="border border-border rounded-md">
        <Grid
          columnCount={cols}
          columnWidth={cellSize + 8}
          rowCount={rowCount}
          rowHeight={cellSize + 8}
          cellComponent={Cell}
          cellProps={{}} // requerido en v2
          style={{ height: 360, width: gridWidth }} // en v2 el tamaño va por style (no height/width props)
        />
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {selected.length} de {total} números disponibles
      </p>
    </div>
  )
}

