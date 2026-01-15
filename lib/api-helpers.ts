import { apiClient } from "./api-client"

// Raffle endpoints
export const raffleApi = {
  getRaffles: () => apiClient.get("/rifas"),
  getRaffleById: (id: string) => apiClient.get(`/rifas/${id}`),
  createRaffle: (data: any) => apiClient.post("/rifas/create", data),
  reserveNumber: (data: any) => apiClient.post("/rifas/reserve", data),
  confirmPayment: (data: any) => apiClient.post("/rifas/confirm-payment", data),
  rejectReservation: (data: any) => apiClient.post("/rifas/reject-reservation", data),
  closeRaffle: (id: string) => apiClient.patch(`/rifas/${id}/close`),
  deleteRaffle: (id: string) => apiClient.delete(`/rifas/${id}`),
}

// Auth endpoints
export const authApi = {
  // 🔥 CORREGIDO: la ruta correcta es /admins/login
  login: (email: string, password: string) =>
    apiClient.post("/admins/login", { email, password }),
  me: () => apiClient.get("/admins/me"),

  logout: () => {
    localStorage.removeItem("adminToken")
  },
}

// Números de rifa
export const numbersApi = {
  getAvailable: (rifaId: string) => apiClient.get(`/rifas/available/${rifaId}`),
  getReservedAll: () => apiClient.get("/rifas/reserved/all"),
  getReserved: (rifaId: string) => apiClient.get(`/rifas/reserved/${rifaId}`),
  getPaid: (rifaId: string) => apiClient.get(`/rifas/paid/${rifaId}`),
}

// TODO (backend no implementado): reservas, redes sociales, configuraciones adicionales
