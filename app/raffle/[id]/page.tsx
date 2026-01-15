"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import NumberGrid from "@/components/number-grid"
import { numbersApi, raffleApi } from "@/lib/api-helpers"

export default function RafflePage() {
  const params = useParams()
  const [raffle, setRaffle] = useState<any>(null)
  const [selectedNumbers, setSelectedNumbers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [availableNumbers, setAvailableNumbers] = useState<string[]>([])
  const [loadingNumbers, setLoadingNumbers] = useState(true)
  const [reserveOpen, setReserveOpen] = useState(false)
  const [reserveForm, setReserveForm] = useState({
    full_name: "",
    user_whatsapp: "",
    payment_ref: "",
    banco_cliente: "",
  })
  const [reserveError, setReserveError] = useState("")
  const [reserveSuccess, setReserveSuccess] = useState("")
  const [reserving, setReserving] = useState(false)

  useEffect(() => {
    const fetchRaffle = async () => {
      setError("")
      setLoading(true)
      try {
        const { data } = await raffleApi.getRaffleById(params.id as string)
        if (!data?.data) {
          setError("Rifa no encontrada")
          setLoading(false)
          return
        }
        const r = data.data
        const datosPago = r.datos_pago_admin || {}
        setRaffle({
          id: r.id,
          title: r.nombre,
          description: r.descripcion || "Rifa disponible",
          image: r.image_url || "/placeholder.svg",
          price: Number(r.precio_numero) || 0,
          moneda: r.moneda || "USD",
          numbers_total: Number(r.numbers_total ?? r.rango_maximo) || 0,
          numbers_sold: Number(r.numbers_sold) || 0,
          prize_label: datosPago.premio || "No especificado",
          prize_loteria: datosPago.loteria || "",
          prize_hora: datosPago.hora_sorteo || "",
          payment: {
            titular: datosPago.titular_nombre || "",
            telefono: datosPago.numero_telefono || "",
            cedula: datosPago.cedula_id || "",
            banco: datosPago.banco || "",
          },
          start_date: r.created_at || r.fecha_sorteo,
          end_date: r.fecha_sorteo,
          draw_date: r.fecha_sorteo,
          details: "Detalles no disponibles",
        })
      } catch (err) {
        setError("No se pudo cargar la rifa")
      } finally {
        setLoading(false)
      }
    }
    fetchRaffle()
  }, [params.id])

  useEffect(() => {
    const fetchAvailableNumbers = async () => {
      if (!params?.id) return
      setLoadingNumbers(true)
      try {
        const { data } = await numbersApi.getAvailable(params.id as string)
        const nums = (data?.data || []).map((n: any) => n.numero)
        setAvailableNumbers(nums)
      } catch {
        setAvailableNumbers([])
      } finally {
        setLoadingNumbers(false)
      }
    }

    fetchAvailableNumbers()
  }, [params.id])

  const progress = useMemo(() => {
    if (!raffle || !raffle.numbers_total) return 0
    return (raffle.numbers_sold / raffle.numbers_total) * 100
  }, [raffle])

  const totalPrice = useMemo(() => (raffle ? selectedNumbers.length * raffle.price : 0), [raffle, selectedNumbers])

  const handleReserveSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!raffle) return
    if (selectedNumbers.length === 0) {
      setReserveError("Selecciona al menos un número.")
      return
    }

    setReserveError("")
    setReserveSuccess("")
    setReserving(true)

    try {
      const payloadBase = {
        rifa_id: raffle.id,
        user_whatsapp: reserveForm.user_whatsapp,
        full_name: reserveForm.full_name,
        payment_ref: reserveForm.payment_ref,
        banco_cliente: reserveForm.banco_cliente,
      }

      const results = await Promise.allSettled(
        selectedNumbers.map((numero) => raffleApi.reserveNumber({ ...payloadBase, numero })),
      )

      const successNums: string[] = []
      const failedNums: string[] = []
      let firstError = ""

      results.forEach((result, idx) => {
        const numero = selectedNumbers[idx]
        if (result.status === "fulfilled") {
          successNums.push(numero)
        } else {
          failedNums.push(numero)
          if (!firstError) {
            firstError = result.reason?.response?.data?.message || "No se pudo reservar."
          }
        }
      })

      if (successNums.length > 0) {
        setAvailableNumbers((prev) => prev.filter((num) => !successNums.includes(num)))
        setSelectedNumbers((prev) => prev.filter((num) => !successNums.includes(num)))
        setReserveSuccess(`Reservados: ${successNums.join(", ")}`)
      }

      if (failedNums.length > 0) {
        setReserveError(`${firstError} Números: ${failedNums.join(", ")}`)
      } else {
        setReserveForm({
          full_name: "",
          user_whatsapp: "",
          payment_ref: "",
          banco_cliente: "",
        })
        setReserveOpen(false)
      }
    } finally {
      setReserving(false)
    }
  }

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

  if (error || !raffle) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 py-20 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-2xl font-bold text-destructive">{error || "Rifa no encontrada"}</h1>
            <Button asChild className="mt-4">
              <Link href="/raffles">Volver a Rifas</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <Button variant="ghost" asChild className="mb-6">
            <Link href="/raffles">← Volver a Rifas</Link>
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 lg:order-2">
              <Card className="lg:sticky lg:top-24 p-6 border-primary">
                <h3 className="font-bold text-lg mb-4 text-primary">Selecciona tus Números</h3>

                {loadingNumbers ? (
                  <p className="text-sm text-muted-foreground">Cargando números disponibles...</p>
                ) : availableNumbers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay números disponibles.</p>
                ) : (
                  <NumberGrid
                    total={raffle.numbers_total}
                    availableNumbers={availableNumbers}
                    selected={selectedNumbers}
                    onSelect={setSelectedNumbers}
                    soldNumbers={[]}
                  />
                )}

                <div className="mt-6 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Números seleccionados:</span>
                    <span className="font-bold">{selectedNumbers.length}</span>
                  </div>
                  <div className="flex justify-between text-lg border-t border-border pt-3">
                    <span className="font-bold">Total:</span>
                    <span className="text-primary font-bold text-xl">
                      {raffle.moneda} {totalPrice}
                    </span>
                  </div>
                </div>

                <Button
                  disabled={selectedNumbers.length === 0 || loadingNumbers}
                  className="w-full mt-6 bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => {
                    setReserveError("")
                    setReserveSuccess("")
                    setReserveOpen(true)
                  }}
                >
                  Comprar ({selectedNumbers.length})
                </Button>

                <p className="text-xs text-muted-foreground text-center mt-4">
                  Los números se asignarán al azar si no los especificas
                </p>
              </Card>
            </div>

            <div className="lg:col-span-2 lg:order-1">
              <Card className="overflow-hidden">
                <img src={raffle.image || "/placeholder.svg"} alt={raffle.title} className="w-full h-96 object-cover" />
              </Card>

              <div className="mt-8">
                <h1 className="text-4xl font-bold mb-4 text-primary">{raffle.title}</h1>
                <p className="text-lg text-muted-foreground mb-6">{raffle.description}</p>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <Card className="p-4 bg-secondary/50 border-border">
                    <p className="text-sm text-muted-foreground mb-1">Premio</p>
                    <p className="text-2xl font-bold text-primary">{raffle.prize_label}</p>
                  </Card>
                  <Card className="p-4 bg-secondary/50 border-border">
                    <p className="text-sm text-muted-foreground mb-1">Precio por Número</p>
                    <p className="text-2xl font-bold text-primary">
                      {raffle.moneda} {raffle.price}
                    </p>
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
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Premio: {raffle.prize_label}</p>
                    <p>Lotería: {raffle.prize_loteria || "N/A"}</p>
                    <p>Hora del sorteo: {raffle.prize_hora || "N/A"}</p>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-lg p-6 mb-8">
                  <h3 className="font-bold text-lg mb-3">Datos de Pago Móvil</h3>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Titular: {raffle.payment?.titular || "N/A"}</p>
                    <p>Teléfono: {raffle.payment?.telefono || "N/A"}</p>
                    <p>Cédula: {raffle.payment?.cedula || "N/A"}</p>
                    <p>Banco: {raffle.payment?.banco || "N/A"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Inicio de Venta</p>
                    <p className="font-bold">
                      {raffle.start_date ? new Date(raffle.start_date).toLocaleDateString("es-ES") : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cierre de Venta</p>
                    <p className="font-bold">
                      {raffle.end_date ? new Date(raffle.end_date).toLocaleDateString("es-ES") : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fecha de Sorteo</p>
                    <p className="font-bold">
                      {raffle.draw_date ? new Date(raffle.draw_date).toLocaleDateString("es-ES") : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Dialog
        open={reserveOpen}
        onOpenChange={(open) => {
          setReserveOpen(open)
          if (!open) {
            setReserveError("")
            setReserveSuccess("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Completa tu compra</DialogTitle>
            <DialogDescription>
              Números seleccionados: {selectedNumbers.length > 0 ? selectedNumbers.join(", ") : "Ninguno"}
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleReserveSubmit}>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Nombre completo</label>
              <Input
                name="full_name"
                value={reserveForm.full_name}
                onChange={(e) => setReserveForm((prev) => ({ ...prev, full_name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">WhatsApp</label>
              <Input
                name="user_whatsapp"
                value={reserveForm.user_whatsapp}
                onChange={(e) => setReserveForm((prev) => ({ ...prev, user_whatsapp: e.target.value }))}
                placeholder="+58..."
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Referencia de pago</label>
              <Input
                name="payment_ref"
                value={reserveForm.payment_ref}
                onChange={(e) => setReserveForm((prev) => ({ ...prev, payment_ref: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Banco del cliente</label>
              <Input
                name="banco_cliente"
                value={reserveForm.banco_cliente}
                onChange={(e) => setReserveForm((prev) => ({ ...prev, banco_cliente: e.target.value }))}
                required
              />
            </div>

            {reserveError && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded p-3">
                {reserveError}
              </div>
            )}

            {reserveSuccess && (
              <div className="text-sm text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 rounded p-3">
                {reserveSuccess}
              </div>
            )}

            <DialogFooter>
              <Button type="submit" disabled={reserving || selectedNumbers.length === 0}>
                {reserving ? "Reservando..." : "Confirmar reserva"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}
