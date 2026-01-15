"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Grid, type CellComponentProps } from "react-window"
import { Input } from "@/components/ui/input"

interface NumberGridProps {
  total: number
  selected: string[]
  onSelect: (numbers: string[]) => void
  soldNumbers: string[]
  availableNumbers?: string[]
}

export default function NumberGrid({ total, selected, onSelect, soldNumbers, availableNumbers }: NumberGridProps) {
  const [searchNumber, setSearchNumber] = useState("")
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [gridWidth, setGridWidth] = useState(0)

  const numDigits = useMemo(() => String(total - 1).length, [total])
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
    const available = availableNumbers ? [...availableNumbers] : allNumbers.filter((n) => !soldNumbers.includes(n))

    if (available.length === 0) return

    const count = Math.min(10, available.length)
    const random: string[] = []
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * available.length)
      random.push(available[idx])
      available.splice(idx, 1)
    }
    onSelect(random)
  }, [availableNumbers, formatNumber, onSelect, soldNumbers, total])

  const allNumbers = useMemo(() => {
    if (availableNumbers) return availableNumbers
    return Array.from({ length: total }, (_, i) => formatNumber(i))
  }, [availableNumbers, total, formatNumber])

  const filteredNumbers = useMemo(() => {
    if (!searchNumber) return allNumbers
    return allNumbers.filter((num) => num.includes(searchNumber))
  }, [allNumbers, searchNumber])

  const displayTotal = availableNumbers ? availableNumbers.length : total
  const baseCellSize = displayTotal <= 100 ? 40 : 32
  const cols = gridWidth
    ? Math.max(1, Math.floor(gridWidth / (baseCellSize + 8)))
    : displayTotal <= 100
      ? 10
      : 20
  const cellSize = gridWidth
    ? Math.max(28, Math.min(baseCellSize, Math.floor((gridWidth - (cols - 1) * 8) / cols)))
    : baseCellSize
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

  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current
    const updateWidth = () => setGridWidth(el.clientWidth)
    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const resolvedGridWidth = gridWidth || cols * (cellSize + 8)

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

      <div ref={containerRef} className="border border-border rounded-md">
        <Grid
          columnCount={cols}
          columnWidth={cellSize + 8}
          rowCount={rowCount}
          rowHeight={cellSize + 8}
          cellComponent={Cell}
          cellProps={{}} // requerido en v2
          style={{ height: 360, width: resolvedGridWidth }} // en v2 el tamaño va por style (no height/width props)
        />
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {selected.length} de {displayTotal} números disponibles
      </p>
    </div>
  )
}
