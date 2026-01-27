import { create } from 'zustand'
import { getApiBaseUrl, setApiBaseUrl, getAuthToken, setAuthToken } from '../services/auth'

type AppState = {
  apiBaseUrl: string
  authToken: string | null
  expiredCount: number
  maintenanceCount: number
  discardedCount: number
  setApiBaseUrlState: (url: string) => void
  setAuthTokenState: (token: string) => void
  setExpiredCount: (count: number) => void
  setMaintenanceCount: (count: number) => void
  setDiscardedCount: (count: number) => void
}

export const useAppStore = create<AppState>((set) => ({
  apiBaseUrl: getApiBaseUrl(),
  authToken: getAuthToken(),
  expiredCount: 0,
  maintenanceCount: 0,
  discardedCount: 0,
  setApiBaseUrlState: (url) => {
    setApiBaseUrl(url)
    set({ apiBaseUrl: url })
  },
  setAuthTokenState: (token) => {
    setAuthToken(token)
    set({ authToken: token })
  },
  setExpiredCount: (count) => set({ expiredCount: count }),
  setMaintenanceCount: (count) => set({ maintenanceCount: count }),
  setDiscardedCount: (count) => set({ discardedCount: count }),
}))