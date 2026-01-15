"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import AdminNav from "@/components/admin-nav"
import AdminSidebar from "@/components/admin-sidebar"
import { AuthGuard } from "@/components/auth-guard"
import { numbersApi, raffleApi } from "@/lib/api-helpers"

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview")
  const [stats, setStats] = useState({
    total_raffles: 4,
    active_raffles: 3,
    total_revenue: 125450,
    total_tickets_sold: 2850,
  })
  const [raffles, setRaffles] = useState<any[]>([])
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState("")
  const [createSuccess, setCreateSuccess] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const [uploadSuccess, setUploadSuccess] = useState("")
  const [pendingReservations, setPendingReservations] = useState<any[]>([])
  const [loadingPending, setLoadingPending] = useState(false)
  const [pendingError, setPendingError] = useState("")
  const [pendingSuccess, setPendingSuccess] = useState("")
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [loadingRaffles, setLoadingRaffles] = useState(false)
  const [rafflesError, setRafflesError] = useState("")
  const [closingRaffleId, setClosingRaffleId] = useState<string | null>(null)
  const [deletingRaffleId, setDeletingRaffleId] = useState<string | null>(null)
  const [form, setForm] = useState({
    nombre: "",
    precio_numero: "",
    moneda: "USD",
    fecha_sorteo: "",
    rango_maximo: "",
    premio: "",
    loteria: "",
    hora_sorteo: "",
    titular_nombre: "",
    numero_telefono: "",
    cedula_id: "",
    banco: "",
    image_url: "",
    image_file_url: "",
  })
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const mobileTabs = [
    { id: "overview", label: "General" },
    { id: "raffles", label: "Rifas" },
    { id: "sales", label: "Ventas" },
    { id: "settings", label: "Configuración" },
  ]

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const loadRaffles = useCallback(async () => {
    setRafflesError("")
    setLoadingRaffles(true)
    try {
      const { data } = await raffleApi.getRaffles()
      const list = data?.data || data?.rifas || data || []
      const listArray = Array.isArray(list) ? list : []
      setRaffles(listArray)
      const total = listArray.length
      const active = listArray.filter((r) => r.is_active !== false).length
      const soldTotal = listArray.reduce((sum, r) => sum + (Number(r.numbers_sold) || 0), 0)
      const revenueTotal = listArray.reduce(
        (sum, r) => sum + (Number(r.numbers_sold) || 0) * (Number(r.precio_numero) || 0),
        0
      )
      setStats({
        total_raffles: total,
        active_raffles: active,
        total_revenue: revenueTotal,
        total_tickets_sold: soldTotal,
      })
    } catch (err: any) {
      setRafflesError(err?.response?.data?.message || "No se pudieron cargar las rifas")
    } finally {
      setLoadingRaffles(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === "raffles" || activeTab === "overview") {
      loadRaffles()
    }
  }, [activeTab, loadRaffles])

  const loadPendingReservations = useCallback(async () => {
    setPendingError("")
    setPendingSuccess("")
    setLoadingPending(true)
    try {
      const { data } = await numbersApi.getReservedAll()
      const list = data?.data || []
      setPendingReservations(Array.isArray(list) ? list : [])
    } catch (err: any) {
      setPendingError(err?.response?.data?.message || "No se pudieron cargar las reservas")
    } finally {
      setLoadingPending(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab !== "sales") return
    loadPendingReservations()
    const interval = setInterval(loadPendingReservations, 15000)
    return () => clearInterval(interval)
  }, [activeTab, loadPendingReservations])

  const handleCreateRaffle = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError("")
    setCreateSuccess("")
    setCreating(true)
    try {
      const payload = {
        nombre: form.nombre,
        precio_numero: Number(form.precio_numero),
        fecha_sorteo: form.fecha_sorteo,
        rango_maximo: Number(form.rango_maximo),
        datos_pago_admin: {
          titular_nombre: form.titular_nombre,
          numero_telefono: form.numero_telefono,
          cedula_id: form.cedula_id,
          banco: form.banco,
          premio: form.premio,
          loteria: form.loteria,
          hora_sorteo: form.hora_sorteo,
        },
        image_url: (form.image_url && form.image_url.trim()) || imagePreview || null,
        moneda: form.moneda || "USD",
      }
      await raffleApi.createRaffle(payload)
      setCreateSuccess("Rifa creada correctamente")
      await loadRaffles()
      setForm({
        nombre: "",
        precio_numero: "",
        moneda: "USD",
        fecha_sorteo: "",
        rango_maximo: "",
        premio: "",
        loteria: "",
        hora_sorteo: "",
        titular_nombre: "",
        numero_telefono: "",
        cedula_id: "",
        banco: "",
        image_url: "",
        image_file_url: "",
      })
      setImagePreview(null)
    } catch (err: any) {
      setCreateError(err?.response?.data?.message || "No se pudo crear la rifa")
    } finally {
      setCreating(false)
    }
  }

  const handleImageUpload = async (file: File) => {
    setUploadError("")
    setUploadSuccess("")
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/upload/raffle-image", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || "No se pudo subir la imagen")
      }
      setForm((prev) => ({ ...prev, image_url: data.publicUrl || "" }))
      setUploadSuccess("Imagen subida correctamente")
    } catch (err: any) {
      setUploadError(err?.message || "No se pudo subir la imagen")
    } finally {
      setUploading(false)
    }
  }

  const handleCloseRaffle = async (id: string) => {
    setRafflesError("")
    setClosingRaffleId(id)
    try {
      await raffleApi.closeRaffle(id)
      setRaffles((prev) => prev.map((r) => (r.id === id ? { ...r, is_active: false } : r)))
    } catch (err: any) {
      setRafflesError(err?.response?.data?.message || "No se pudo cerrar la rifa")
    } finally {
      setClosingRaffleId(null)
    }
  }

  const handleDeleteRaffle = async (id: string) => {
    setRafflesError("")
    setDeletingRaffleId(id)
    try {
      await raffleApi.deleteRaffle(id)
      setRaffles((prev) => prev.filter((r) => r.id !== id))
    } catch (err: any) {
      setRafflesError(err?.response?.data?.message || "No se pudo eliminar la rifa")
    } finally {
      setDeletingRaffleId(null)
    }
  }

  const handleApproveReservation = async (reservation: any) => {
    setPendingError("")
    setPendingSuccess("")
    setApprovingId(reservation.id || `${reservation.rifa_id}-${reservation.numero}`)
    try {
      await raffleApi.confirmPayment({
        rifa_id: reservation.rifa_id,
        numero: reservation.numero,
      })
      setPendingReservations((prev) =>
        prev.filter(
          (r) =>
            r.id !== reservation.id &&
            !(r.rifa_id === reservation.rifa_id && r.numero === reservation.numero),
        ),
      )
      setPendingSuccess("Reserva aprobada y marcada como pagada.")
    } catch (err: any) {
      setPendingError(err?.response?.data?.message || "No se pudo aprobar la reserva")
    } finally {
      setApprovingId(null)
    }
  }

  const handleRejectReservation = async (reservation: any) => {
    setPendingError("")
    setPendingSuccess("")
    setRejectingId(reservation.id || `${reservation.rifa_id}-${reservation.numero}`)
    try {
      await raffleApi.rejectReservation({
        rifa_id: reservation.rifa_id,
        numero: reservation.numero,
      })
      setPendingReservations((prev) =>
        prev.filter(
          (r) =>
            r.id !== reservation.id &&
            !(r.rifa_id === reservation.rifa_id && r.numero === reservation.numero),
        ),
      )
      setPendingSuccess("Reserva rechazada y número liberado.")
    } catch (err: any) {
      setPendingError(err?.response?.data?.message || "No se pudo rechazar la reserva")
    } finally {
      setRejectingId(null)
    }
  }

  const recentRaffles = [...raffles]
    .sort((a, b) => {
      const aTime = a?.created_at ? new Date(a.created_at).getTime() : 0
      const bTime = b?.created_at ? new Date(b.created_at).getTime() : 0
      return bTime - aTime
    })
    .slice(0, 4)

  return (
    <AuthGuard>
      <div className="flex h-screen bg-background">
        <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="flex-1 flex flex-col overflow-hidden">
          <AdminNav />

          <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              <div className="md:hidden sticky top-0 z-30 -mx-4 px-4 py-2 bg-background/95 backdrop-blur border-b border-border mb-6">
                <div className="flex items-center gap-2 overflow-x-auto">
                  {mobileTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-3 py-2 text-sm rounded-full border transition whitespace-nowrap ${
                        activeTab === tab.id
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-foreground hover:bg-secondary"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-8">
                <h1 className="text-4xl font-bold text-primary">Panel de Control</h1>
                <p className="text-muted-foreground mt-2">Bienvenido al panel administrativo de RaffleHub</p>
              </div>

              {activeTab === "overview" && (
                <div className="space-y-8">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="p-6 bg-card border-border">
                      <p className="text-muted-foreground text-sm mb-1">Rifas Activas</p>
                      <p className="text-3xl font-bold text-primary">{stats.active_raffles}</p>
                      <p className="text-xs text-muted-foreground mt-2">de {stats.total_raffles} totales</p>
                    </Card>

                    <Card className="p-6 bg-card border-border">
                      <p className="text-muted-foreground text-sm mb-1">Boletos Vendidos</p>
                      <p className="text-3xl font-bold text-primary">{stats.total_tickets_sold}</p>
                      <p className="text-xs text-muted-foreground mt-2">total</p>
                    </Card>

                    <Card className="p-6 bg-card border-border">
                      <p className="text-muted-foreground text-sm mb-1">Ingresos Totales</p>
                      <p className="text-3xl font-bold text-primary">${stats.total_revenue.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-2">total</p>
                    </Card>

                    <Card className="p-6 bg-card border-border">
                      <p className="text-muted-foreground text-sm mb-1">Comisión Ganada</p>
                      <p className="text-3xl font-bold text-primary">${Math.floor(stats.total_revenue * 0.1).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-2">10% de ingresos</p>
                    </Card>
                  </div>

                  {/* Recent Raffles */}
                  <Card className="p-6 border-border">
                    <h2 className="text-xl font-bold mb-4">Rifas Recientes</h2>
                    {recentRaffles.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No hay rifas.</p>
                    ) : (
                      <div className="space-y-4">
                        {recentRaffles.map((raffle) => {
                          const total = Number(raffle.numbers_total ?? raffle.rango_maximo ?? 0)
                          const sold = Number(raffle.numbers_sold ?? 0)
                          const progress = total > 0 ? Math.round((sold / total) * 100) : 0
                          const status = raffle.is_active === false ? "Cerrada" : "Activa"

                          return (
                            <div
                              key={raffle.id}
                              className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 border-b border-border last:border-b-0"
                            >
                              <div className="flex-1">
                                <p className="font-medium">{raffle.nombre || "Rifa"}</p>
                                <div className="w-full bg-secondary rounded-full h-2 mt-2">
                                  <div className="bg-primary h-full rounded-full" style={{ width: `${progress}%` }} />
                                </div>
                              </div>
                              <div className="mt-3 sm:mt-0 sm:ml-4 text-right">
                                <p className="text-sm font-medium text-primary">{status}</p>
                                <p className="text-xs text-muted-foreground">{progress}% vendido</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </Card>
                </div>
              )}

              {activeTab === "raffles" && (
                <div className="space-y-6">
                  <Card className="p-6 border-border">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold">Crear Rifa</h2>
                    </div>

                    <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleCreateRaffle}>
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-sm text-muted-foreground">Nombre de la rifa</label>
                        <Input name="nombre" value={form.nombre} onChange={handleChange} required />
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm text-muted-foreground">Precio por número</label>
                        <Input
                          type="number"
                          name="precio_numero"
                          value={form.precio_numero}
                          onChange={handleChange}
                          required
                          min={1}
                          step="0.01"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm text-muted-foreground">Moneda</label>
                        <select
                          name="moneda"
                          value={form.moneda}
                          onChange={handleChange}
                          className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground"
                        >
                          <option value="USD">USD</option>
                          <option value="Bs">Bs</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm text-muted-foreground">Rango máximo (cantidad de números)</label>
                        <Input type="number" name="rango_maximo" value={form.rango_maximo} onChange={handleChange} required min={1} />
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm text-muted-foreground">Fecha de sorteo</label>
                        <Input type="date" name="fecha_sorteo" value={form.fecha_sorteo} onChange={handleChange} required />
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm text-muted-foreground">Premio</label>
                        <Input name="premio" value={form.premio} onChange={handleChange} required />
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm text-muted-foreground">Lotería</label>
                        <Input name="loteria" value={form.loteria} onChange={handleChange} />
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm text-muted-foreground">Hora del sorteo</label>
                        <Input name="hora_sorteo" value={form.hora_sorteo} onChange={handleChange} placeholder="HH:MM" />
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm text-muted-foreground">Titular (datos de pago admin)</label>
                        <Input name="titular_nombre" value={form.titular_nombre} onChange={handleChange} required />
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm text-muted-foreground">Pago Móvil (teléfono)</label>
                        <Input name="numero_telefono" value={form.numero_telefono} onChange={handleChange} required />
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm text-muted-foreground">Cédula/ID del titular</label>
                        <Input name="cedula_id" value={form.cedula_id} onChange={handleChange} required />
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm text-muted-foreground">Banco</label>
                        <Input name="banco" value={form.banco} onChange={handleChange} required />
                      </div>

                      <div className="space-y-1 md:col-span-2">
                        <label className="text-sm text-muted-foreground">Imagen (URL opcional)</label>
                        <Input name="image_url" value={form.image_url} onChange={handleChange} />
                      </div>

                      <div className="space-y-1 md:col-span-2">
                        <label className="text-sm text-muted-foreground">Imagen desde tu dispositivo (opcional)</label>
                        <div className="flex items-center gap-3">
                          <input
                            id="raffle-image-file"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                const url = URL.createObjectURL(file)
                                setImagePreview(url)
                                setForm((prev) => ({ ...prev, image_file_url: url }))
                                handleImageUpload(file)
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="border-primary text-primary bg-transparent"
                            onClick={() => document.getElementById("raffle-image-file")?.click()}
                            disabled={uploading}
                          >
                            {uploading ? "Subiendo..." : "Subir imagen"}
                          </Button>
                          {form.image_url && <span className="text-xs text-muted-foreground">URL lista</span>}
                        </div>
                        {uploadSuccess && <p className="text-xs text-emerald-500">{uploadSuccess}</p>}
                        {uploading && <p className="text-xs text-muted-foreground">Subiendo imagen...</p>}
                        {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
                        {imagePreview && (
                          <div className="mt-2">
                            <img src={imagePreview} alt="Preview" className="h-24 w-24 object-cover rounded border border-border" />
                          </div>
                        )}
                      </div>

                      {createError && (
                        <div className="md:col-span-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded p-3">
                          {createError}
                        </div>
                      )}

                      {createSuccess && (
                        <div className="md:col-span-2 text-sm text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 rounded p-3">
                          {createSuccess}
                        </div>
                      )}

                      <div className="md:col-span-2 flex justify-end">
                        <Button type="submit" disabled={creating} className="bg-primary text-primary-foreground hover:bg-primary/90">
                          {creating ? "Creando..." : "Crear rifa"}
                        </Button>
                      </div>
                    </form>
                  </Card>

                  <Card className="p-6 border-border">
                    <h2 className="text-xl font-bold mb-4">Rifas</h2>
                    {rafflesError && (
                      <div className="mb-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded p-3">
                        {rafflesError}
                      </div>
                    )}
                    {loadingRaffles ? (
                      <p className="text-muted-foreground text-sm">Cargando rifas...</p>
                    ) : raffles.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No hay rifas.</p>
                    ) : (
                      <div className="space-y-3">
                        {raffles.map((r) => (
                          <div
                            key={r.id}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between border border-border rounded p-3 gap-3"
                          >
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                              <div className="w-12 h-12 rounded bg-secondary overflow-hidden flex items-center justify-center">
                                <img
                                  src={r.image_file_url || r.image_url || "/placeholder.svg"}
                                  alt={r.nombre}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div>
                                <p className="font-semibold text-primary">{r.nombre}</p>
                                <p className="text-xs text-muted-foreground">
                                  Precio: {r.moneda || "USD"} {r.precio_numero} • Números: {r.rango_maximo}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
                              <span className="text-xs text-muted-foreground">{r.fecha_sorteo}</span>
                              {r.is_active === false && <span className="text-xs text-muted-foreground">Cerrada</span>}
                              <a href={`/raffle/${r.id}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
                                Ver
                              </a>
                              <Button
                                type="button"
                                variant="outline"
                                className="border-primary text-primary bg-transparent"
                                onClick={() => handleCloseRaffle(r.id)}
                                disabled={r.is_active === false || closingRaffleId === r.id}
                              >
                                {closingRaffleId === r.id ? "Cerrando..." : "Cerrar"}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="border-destructive text-destructive bg-transparent"
                                onClick={() => handleDeleteRaffle(r.id)}
                                disabled={deletingRaffleId === r.id}
                              >
                                {deletingRaffleId === r.id ? "Eliminando..." : "Eliminar"}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>
              )}

              {activeTab === "sales" && (
                <Card className="p-6 border-border">
                  <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                    <h2 className="text-xl font-bold">Reservas Pendientes</h2>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-primary text-primary bg-transparent"
                      onClick={loadPendingReservations}
                      disabled={loadingPending}
                    >
                      {loadingPending ? "Actualizando..." : "Actualizar"}
                    </Button>
                  </div>

                  {pendingError && (
                    <div className="mb-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded p-3">
                      {pendingError}
                    </div>
                  )}

                  {pendingSuccess && (
                    <div className="mb-3 text-sm text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 rounded p-3">
                      {pendingSuccess}
                    </div>
                  )}

                  {loadingPending ? (
                    <p className="text-muted-foreground text-sm">Cargando reservas...</p>
                  ) : pendingReservations.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No hay reservas pendientes.</p>
                  ) : (
                    <div className="space-y-3">
                      {pendingReservations.map((r) => {
                        const rowId = r.id || `${r.rifa_id}-${r.numero}`
                        return (
                          <div key={rowId} className="border border-border rounded p-4 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="font-semibold text-primary">{r.rifa_nombre || "Rifa"}</p>
                              <p className="text-xs text-muted-foreground">Número: {r.numero}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                className="bg-primary text-primary-foreground hover:bg-primary/90"
                                onClick={() => handleApproveReservation(r)}
                                disabled={approvingId === rowId || rejectingId === rowId}
                              >
                                {approvingId === rowId ? "Aprobando..." : "Aprobar"}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="border-destructive text-destructive bg-transparent"
                                onClick={() => handleRejectReservation(r)}
                                disabled={approvingId === rowId || rejectingId === rowId}
                              >
                                {rejectingId === rowId ? "Rechazando..." : "Rechazar"}
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                            <span>Cliente: {r.full_name || "N/A"}</span>
                            <span>WhatsApp: {r.user_whatsapp || "N/A"}</span>
                            <span>Banco: {r.banco_cliente || "N/A"}</span>
                            <span>Referencia: {r.payment_ref || "N/A"}</span>
                          </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </Card>
              )}

              {activeTab === "settings" && (
                <Card className="p-6 border-border">
                  <h2 className="text-xl font-bold mb-4">Configuración</h2>
                  <p className="text-muted-foreground">Ajustes y configuración del sistema</p>
                </Card>
              )}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}

