import { useState } from 'react'
import { getApiBaseUrl, setApiBaseUrl as saveApiBaseUrl, getAuthToken, setAuthToken as saveAuthToken } from '../services/auth'
import { getValidityYears, setValidityYears as saveValidityYears } from '../services/settings'
import { showSuccessToast } from '../utils/toast'

export default function ConfigPage() {
  const [apiBaseUrl, setApiBaseUrl] = useState<string>(getApiBaseUrl())
  const [authToken, setAuthToken] = useState<string>(getAuthToken() || '')
  const [validityYears, setValidityYears] = useState<number>(getValidityYears())

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
            className="w-full rounded border px-3 py-2"
            placeholder="http://localhost:3002"
            value={apiBaseUrl}
            onChange={(e) => setApiBaseUrl(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="authToken" className="mb-1 block text-sm font-medium">Auth Token (Bearer)</label>
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="JWT..."
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="validityYears" className="mb-1 block text-sm font-medium">Tempo de Validade (anos)</label>
          <input
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