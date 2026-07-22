import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { getApiBaseUrl, setApiBaseUrl as saveApiBaseUrl, getAuthToken, setAuthToken as saveAuthToken } from '../services/auth'
import { getValidityYears, setValidityYears as saveValidityYears } from '../services/settings'
import { showSuccessToast } from '../utils/toast'

export default function ConfigPage() {
  const [apiBaseUrl, setApiBaseUrl] = useState<string>(getApiBaseUrl())
  const [authToken, setAuthToken] = useState<string>(getAuthToken() || '')
  const [validityYears, setValidityYears] = useState<number>(getValidityYears())
  const [showToken, setShowToken] = useState(false)

  const salvar = () => {
    saveApiBaseUrl(apiBaseUrl)
    saveAuthToken(authToken)
    saveValidityYears(validityYears)
    showSuccessToast('Configurações salvas com sucesso!')
  }

  return (
    <section className="rounded-lg border bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-lg font-medium">Configuração</h2>
      <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
        <div>
          <label htmlFor="apiBaseUrl" className="mb-1 block text-sm font-medium">API Base URL</label>
          <input
            id="apiBaseUrl"
            className="w-full rounded border px-3 py-2"
            placeholder="http://localhost:3002"
            value={apiBaseUrl}
            onChange={(e) => setApiBaseUrl(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="authToken" className="mb-1 block text-sm font-medium">Auth Token (Bearer)</label>
          <div className="relative">
            <input
              id="authToken"
              type={showToken ? 'text' : 'password'}
              className="w-full rounded border px-3 py-2 pr-10"
              placeholder="JWT..."
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        <div>
          <label htmlFor="validityYears" className="mb-1 block text-sm font-medium">Tempo de Validade (anos)</label>
          <input
            id="validityYears"
            type="number"
            min="1"
            className="w-full rounded border px-3 py-2"
            value={validityYears}
            onChange={(e) => setValidityYears(Number(e.target.value))}
          />
          <p className="text-xs text-gray-500 mt-1">
            Equipamentos com data de aquisição anterior a este período serão destacados.
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={salvar} className="w-full sm:w-auto rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Salvar</button>
      </div>
    </section>
  )
}
