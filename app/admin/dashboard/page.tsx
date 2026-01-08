"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import AdminNav from "@/components/admin-nav"
import AdminSidebar from "@/components/admin-sidebar"
import { AuthGuard } from "@/components/auth-guard"
import { raffleApi } from "@/lib/api-helpers"

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
  const [form, setForm] = useState({
    nombre: "",
    precio_numero: "",
    moneda: "USD",
    fecha_sorteo: "",
    rango_maximo: "",
    titular_nombre: "",
    banco: "",
    cedula_id: "",
    image_url: "",
    image_file_url: "",
  })
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

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
          banco: form.banco,
          // usamos el mismo número de Pago Móvil
          numero_telefono: form.banco,
          cedula_id: form.cedula_id,
        },
        image_url: (form.image_url && form.image_url.trim()) || imagePreview || null,
        moneda: form.moneda || "USD",
      }
      const { data } = await raffleApi.createRaffle(payload)
      setCreateSuccess("Rifa creada correctamente")
      const newId = data?.rifaId || data?.id || Date.now()
      setRaffles((prev) => [
        {
          id: newId,
          ...payload,
        },
        ...prev,
      ])
      setForm({
        nombre: "",
        precio_numero: "",
        moneda: "USD",
        fecha_sorteo: "",
        rango_maximo: "",
        titular_nombre: "",
        banco: "",
        cedula_id: "",
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

  return (
    <AuthGuard>
      <div className="flex h-screen bg-background">
        <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="flex-1 flex flex-col overflow-hidden">
          <AdminNav />

          <main className="flex-1 overflow-auto p-8">
            <div className="max-w-7xl mx-auto">
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
                      <p className="text-xs text-muted-foreground mt-2">en este mes</p>
                    </Card>

                    <Card className="p-6 bg-card border-border">
                      <p className="text-muted-foreground text-sm mb-1">Ingresos Totales</p>
                      <p className="text-3xl font-bold text-primary">${stats.total_revenue.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-2">este trimestre</p>
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
                    <div className="space-y-4">
                      {[
                        { title: "Viaje a Cancún", status: "Activa", progress: 34 },
                        { title: "Auto Deportivo", status: "Activa", progress: 40 },
                        { title: "Joyería de Oro", status: "Por Cerrar", progress: 75 },
                        { title: "Laptop Premium", status: "Activa", progress: 56 },
                      ].map((raffle, i) => (
                        <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
                          <div className="flex-1">
                            <p className="font-medium">{raffle.title}</p>
                            <div className="w-full bg-secondary rounded-full h-2 mt-2">
                              <div className="bg-primary h-full rounded-full" style={{ width: `${raffle.progress}%` }} />
                            </div>
                          </div>
                          <div className="ml-4 text-right">
                            <p className="text-sm font-medium text-primary">{raffle.status}</p>
                            <p className="text-xs text-muted-foreground">{raffle.progress}% vendido</p>
                          </div>
                        </div>
                      ))}
                    </div>
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
                        <label className="text-sm text-muted-foreground">Titular (datos de pago admin)</label>
                        <Input name="titular_nombre" value={form.titular_nombre} onChange={handleChange} required />
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm text-muted-foreground">Pago Móvil</label>
                        <Input name="banco" value={form.banco} onChange={handleChange} required />
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm text-muted-foreground">Cédula/ID del titular</label>
                        <Input name="cedula_id" value={form.cedula_id} onChange={handleChange} required />
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
                    <h2 className="text-xl font-bold mb-4">Rifas creadas en esta sesión</h2>
                    {raffles.length === 0 ? (
                      <p className="text-muted-foreground text-sm">Aún no has creado rifas.</p>
                    ) : (
                      <div className="space-y-3">
                        {raffles.map((r) => (
                          <div key={r.id} className="flex items-center justify-between border border-border rounded p-3 gap-3">
                            <div className="flex items-center gap-3">
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
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground">{r.fecha_sorteo}</span>
                              <a href={`/raffle/${r.id}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
                                Ver
                              </a>
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
                  <h2 className="text-xl font-bold mb-4">Ventas y Reportes</h2>
                  <p className="text-muted-foreground">Sección de ventas y reportes detallados</p>
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
