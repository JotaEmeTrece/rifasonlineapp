"use client"

import { BarChart3, Settings, TicketCheck, TrendingUp } from "lucide-react"

interface AdminSidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
}

export default function AdminSidebar({ activeTab, setActiveTab }: AdminSidebarProps) {
  const menuItems = [
    { id: "overview", label: "General", icon: BarChart3 },
    { id: "raffles", label: "Rifas", icon: TicketCheck },
    { id: "sales", label: "Ventas", icon: TrendingUp },
    { id: "settings", label: "Configuración", icon: Settings },
  ]

  return (
    <aside className="w-64 bg-card border-r border-border hidden md:flex flex-col">
      <div className="p-6 border-b border-border">
        <h2 className="text-lg font-bold text-primary">Menú</h2>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    activeTab === item.id ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">RaffleHub © 2025</p>
      </div>
    </aside>
  )
}
