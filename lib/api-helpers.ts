import { apiClient } from "./api-client"

// Raffle endpoints
export const raffleApi = {
  getRaffles: () => apiClient.get("/rifas"),
  getRaffleById: (id: string) => apiClient.get(`/rifas/${id}`),
  createRaffle: (data: any) => apiClient.post("/rifas", data),
  updateRaffle: (id: string, data: any) => apiClient.put(`/rifas/${id}`, data),
  deleteRaffle: (id: string) => apiClient.delete(`/rifas/${id}`),
  reserveNumber: (data: any) => apiClient.post("/rifas/reservar", data),
}

// Auth endpoints
export const authApi = {
  login: (email: string, password: string) => apiClient.post("/auth/login", { email, password }),
  logout: () => {
    localStorage.removeItem("adminToken")
  },
}

// Reservation endpoints
export const reservationApi = {
  getPendingReservations: () => apiClient.get("/reservas?status=pending"),
  confirmPayment: (id: string) => apiClient.patch(`/reservas/${id}/confirmar`),
  getAllReservations: () => apiClient.get("/reservas"),
}

// Social networks endpoints
export const socialNetworksApi = {
  getSocialNetworks: () => apiClient.get("/config/redes"),
  updateSocialNetworks: (data: any) => apiClient.post("/config/redes", data),
}

// Configuration endpoints
export const configApi = {
  updateTicketBackground: (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    return apiClient.post("/config/ticket-bg", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  },
}
