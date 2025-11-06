import { useState } from 'react'
import { getApiBaseUrl, setApiBaseUrl, getAuthToken, setAuthToken } from '../services/auth'

export default function ConfigPage() {
  const [apiBaseUrl, setApiUrlState] = useState<string>(getApiBaseUrl())
  const [authTokenInput, setAuthTokenInput] = useState<string>(getAuthToken() || '')

  const salvar = () => {
    setApiBaseUrl(apiBaseUrl)
    setAuthToken(authTokenInput)
  }

  return (
    <section className="rounded-lg border bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-lg font-medium">Configuração</h2>
      <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">API Base URL</label>
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="http://localhost:3002"
            value={apiBaseUrl}
            onChange={(e) => setApiUrlState(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Auth Token (Bearer)</label>
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="JWT..."
            value={authTokenInput}
            onChange={(e) => setAuthTokenInput(e.target.value)}
          />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={salvar} className="w-full sm:w-auto rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Salvar</button>
      </div>
    </section>
  )
}