import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { getApiBaseUrl, setApiBaseUrl as saveApiBaseUrl, getAuthToken, setAuthToken as saveAuthToken } from '../services/auth'
import { getValidityYears, setValidityYears as saveValidityYears, getBloquearEditarExcluirDoado, setBloquearEditarExcluirDoado as saveBloquearEditarExcluirDoado } from '../services/settings'
import { showSuccessToast } from '../utils/toast'

export default function ConfigPage() {
  const [apiBaseUrl, setApiBaseUrl] = useState<string>(getApiBaseUrl())
  const [authToken, setAuthToken] = useState<string>(getAuthToken() || '')
  const [validityYears, setValidityYears] = useState<number>(getValidityYears())
  const [bloquearEditarExcluirDoado, setBloquearEditarExcluirDoado] = useState<boolean>(getBloquearEditarExcluirDoado())
  const [showToken, setShowToken] = useState(false)

  const salvar = () => {
    saveApiBaseUrl(apiBaseUrl)
    saveAuthToken(authToken)
    saveValidityYears(validityYears)
    saveBloquearEditarExcluirDoado(bloquearEditarExcluirDoado)
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
              aria-label={showToken ? 'Ocultar token de autenticação' : 'Mostrar token de autenticação'}
              aria-pressed={showToken}
              aria-controls="authToken"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showToken ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
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
        <div className="md:col-span-2">
          <fieldset className="rounded-lg border border-gray-200 bg-gray-50/60 p-3 sm:p-4">
            <legend className="mb-2 text-sm font-medium text-gray-800">Segurança</legend>
            <label htmlFor="switch-doado" className="flex cursor-pointer items-start justify-between gap-4 sm:gap-6">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-6 text-gray-900">Bloquear Editar e Excluir equipamentos Doados</p>
                <p className="mt-0.5 text-xs leading-5 text-gray-500">
                  Quando ativado, os botões Editar e Excluir não serão exibidos em equipamentos com status <strong>DOADO</strong>.
                  Desative apenas se precisar corrigir registros históricos.
                </p>
              </div>
              <button
                id="switch-doado"
                type="button"
                role="switch"
                aria-checked={bloquearEditarExcluirDoado}
                aria-label="Bloquear editar e excluir equipamentos doados"
                onClick={() => setBloquearEditarExcluirDoado(!bloquearEditarExcluirDoado)}
                className={`relative mt-0.5 shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 ${bloquearEditarExcluirDoado ? 'bg-blue-600' : 'bg-gray-300'}`}
              >
                <span
                  aria-hidden
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${bloquearEditarExcluirDoado ? 'translate-x-5' : 'translate-x-0.5'}`}
                />
              </button>
            </label>
          </fieldset>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={salvar} className="w-full sm:w-auto rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Salvar</button>
      </div>
    </section>
  )
}
