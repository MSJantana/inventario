import { create } from 'zustand'
import { getApiBaseUrl, setApiBaseUrl, getAuthToken, setAuthToken } from '../services/auth'

type AppState = {
  apiBaseUrl: string
  authToken: string | null
  setApiBaseUrlState: (url: string) => void
  setAuthTokenState: (token: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  apiBaseUrl: getApiBaseUrl(),
  authToken: getAuthToken(),
  setApiBaseUrlState: (url) => {
    setApiBaseUrl(url)
    set({ apiBaseUrl: url })
  },
  setAuthTokenState: (token) => {
    setAuthToken(token)
    set({ authToken: token })
  },
}))