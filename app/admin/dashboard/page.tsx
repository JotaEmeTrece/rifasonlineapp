"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import AdminNav from "@/components/admin-nav"
import AdminSidebar from "@/components/admin-sidebar"
import { AuthGuard } from "@/components/auth-guard"

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview")
  const [stats, setStats] = useState({
    total_raffles: 4,
    active_raffles: 3,
    total_revenue: 125450,
    total_tickets_sold: 2850,
  })

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
                      <p className="text-3xl font-bold text-primary">
                        ${Math.floor(stats.total_revenue * 0.1).toLocaleString()}
                      </p>
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
                        <div
                          key={i}
                          className="flex items-center justify-between py-3 border-b border-border last:border-b-0"
                        >
                          <div className="flex-1">
                            <p className="font-medium">{raffle.title}</p>
                            <div className="w-full bg-secondary rounded-full h-2 mt-2">
                              <div
                                className="bg-primary h-full rounded-full"
                                style={{ width: `${raffle.progress}%` }}
                              />
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
                <Card className="p-6 border-border">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Gestionar Rifas</h2>
                    <Button className="bg-primary text-primary-foreground hover:bg-primary/90">+ Nueva Rifa</Button>
                  </div>
                  <p className="text-muted-foreground">Funcionalidad de gestión de rifas</p>
                </Card>
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
