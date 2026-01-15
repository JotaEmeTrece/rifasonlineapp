"use client"

import { useEffect, useMemo, useState } from "react"
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
import RaffleGrid from "@/components/raffle-grid"
import NumberGrid from "@/components/number-grid"
import Footer from "@/components/footer"
import { numbersApi, raffleApi } from "@/lib/api-helpers"

export default function Home() {
  const [raffles, setRaffles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeRaffle, setActiveRaffle] = useState<any | null>(null)
  const [availableNumbers, setAvailableNumbers] = useState<string[]>([])
  const [loadingNumbers, setLoadingNumbers] = useState(false)
  const [selectedNumbers, setSelectedNumbers] = useState<string[]>([])
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
    const fetchRaffles = async () => {
      try {
        const { data } = await raffleApi.getRaffles()
        const list = data?.data || []
        const activeList = list.filter((r: any) => r.is_active !== false)

        if (activeList.length === 1) {
          const r = activeList[0]
          const datosPago = r.datos_pago_admin || {}
          setActiveRaffle({
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
          })
        } else {
          setActiveRaffle(null)
        }

        const mapped = list.filter((r: any) => r.is_active !== false).map((r: any) => ({
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
        setActiveRaffle(null)
      } finally {
        setLoading(false)
      }
    }
    fetchRaffles()
  }, [])

  useEffect(() => {
    const fetchAvailableNumbers = async () => {
      if (!activeRaffle?.id) return
      setLoadingNumbers(true)
      try {
        const { data } = await numbersApi.getAvailable(activeRaffle.id)
        const nums = (data?.data || []).map((n: any) => n.numero)
        setAvailableNumbers(nums)
      } catch {
        setAvailableNumbers([])
      } finally {
        setLoadingNumbers(false)
      }
    }

    fetchAvailableNumbers()
  }, [activeRaffle?.id])

  const totalPrice = useMemo(
    () => (activeRaffle ? selectedNumbers.length * activeRaffle.price : 0),
    [activeRaffle, selectedNumbers],
  )

  const handleReserveSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeRaffle) return
    if (selectedNumbers.length === 0) {
      setReserveError("Selecciona al menos un número.")
      return
    }

    setReserveError("")
    setReserveSuccess("")
    setReserving(true)

    try {
      const payloadBase = {
        rifa_id: activeRaffle.id,
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

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        {activeRaffle ? (
          <section className="py-10 px-4">
            <div className="max-w-6xl mx-auto">
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
                        total={activeRaffle.numbers_total}
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
                          {activeRaffle.moneda} {totalPrice}
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
                    <img
                      src={activeRaffle.image || "/placeholder.svg"}
                      alt={activeRaffle.title}
                      className="w-full h-96 object-cover"
                    />
                  </Card>

                  <div className="mt-8">
                    <h1 className="text-4xl font-bold mb-4 text-primary">{activeRaffle.title}</h1>
                    <p className="text-lg text-muted-foreground mb-6">{activeRaffle.description}</p>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <Card className="p-4 bg-secondary/50 border-border">
                        <p className="text-sm text-muted-foreground mb-1">Premio</p>
                        <p className="text-2xl font-bold text-primary">{activeRaffle.prize_label}</p>
                      </Card>
                      <Card className="p-4 bg-secondary/50 border-border">
                        <p className="text-sm text-muted-foreground mb-1">Precio por Número</p>
                        <p className="text-2xl font-bold text-primary">
                          {activeRaffle.moneda} {activeRaffle.price}
                        </p>
                      </Card>
                    </div>

                    <div className="mb-8">
                      <h3 className="font-bold text-lg mb-3">Progreso de Venta</h3>
                      <div className="w-full bg-secondary rounded-full h-4 overflow-hidden mb-2">
                        <div
                          className="bg-primary h-full transition-all"
                          style={{ width: `${activeRaffle.numbers_total ? (activeRaffle.numbers_sold / activeRaffle.numbers_total) * 100 : 0}%` }}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {activeRaffle.numbers_sold} de {activeRaffle.numbers_total} números vendidos
                      </p>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-6 mb-8">
                      <h3 className="font-bold text-lg mb-3">Detalles del Premio</h3>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Premio: {activeRaffle.prize_label}</p>
                        <p>Lotería: {activeRaffle.prize_loteria || "N/A"}</p>
                        <p>Hora del sorteo: {activeRaffle.prize_hora || "N/A"}</p>
                      </div>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-6 mb-8">
                      <h3 className="font-bold text-lg mb-3">Datos de Pago Móvil</h3>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Titular: {activeRaffle.payment?.titular || "N/A"}</p>
                        <p>Teléfono: {activeRaffle.payment?.telefono || "N/A"}</p>
                        <p>Cédula: {activeRaffle.payment?.cedula || "N/A"}</p>
                        <p>Banco: {activeRaffle.payment?.banco || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <>
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

            <section className="py-16 px-4">
              <div className="max-w-6xl mx-auto">
                <h2 className="text-3xl font-bold mb-12 text-primary">Rifas Activas</h2>
                <RaffleGrid raffles={raffles} loading={loading} />
              </div>
            </section>
          </>
        )}
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
