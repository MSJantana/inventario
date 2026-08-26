import type { AxiosRequestConfig } from 'axios'
import api from '../lib/axios'
import type {
  WinAuditLogDetalhe,
  WinAuditLogListagemResponse,
} from '../types/winaudit'

export type AuditoriaFiltros = {
  readonly status?: string
  readonly arquivoOriginalContem?: string
  readonly usuarioId?: string
  readonly equipamentoId?: string
  readonly dataInicio?: string
  readonly dataFim?: string
}

export const listarLogsImportacao = async (
  params: {
    readonly pagina?: number
    readonly porPagina?: number
    readonly filtros?: AuditoriaFiltros
  } = {},
  config?: AxiosRequestConfig,
): Promise<WinAuditLogListagemResponse> => {
  const { pagina = 1, porPagina = 25, filtros } = params
  const queryParams = new URLSearchParams()
  queryParams.set('pagina', String(pagina))
  queryParams.set('porPagina', String(porPagina))
  if (filtros) {
    if (filtros.status) queryParams.set('status', filtros.status)
    if (filtros.arquivoOriginalContem) {
      queryParams.set('arquivoOriginalContem', filtros.arquivoOriginalContem)
    }
    if (filtros.usuarioId) queryParams.set('usuarioId', filtros.usuarioId)
    if (filtros.equipamentoId) queryParams.set('equipamentoId', filtros.equipamentoId)
    if (filtros.dataInicio) queryParams.set('dataInicio', filtros.dataInicio)
    if (filtros.dataFim) queryParams.set('dataFim', filtros.dataFim)
  }
  const resp = await api.get(`/api/equipamentos/importar/winaudit/logs?${queryParams.toString()}`, config)
  return resp.data as WinAuditLogListagemResponse
}

export const obterLogImportacaoPorId = async (
  id: string,
  config?: AxiosRequestConfig,
): Promise<WinAuditLogDetalhe> => {
  const resp = await api.get(`/api/equipamentos/importar/winaudit/logs/${encodeURIComponent(id)}`, config)
  return resp.data as WinAuditLogDetalhe
}

export const exportarRelatorioAuditoriaCSV = async (
  filtros: AuditoriaFiltros,
): Promise<void> => {
  const queryParams = new URLSearchParams()
  queryParams.set('pagina', '1')
  queryParams.set('porPagina', '200')
  if (filtros.status) queryParams.set('status', filtros.status)
  if (filtros.arquivoOriginalContem) {
    queryParams.set('arquivoOriginalContem', filtros.arquivoOriginalContem)
  }
  if (filtros.usuarioId) queryParams.set('usuarioId', filtros.usuarioId)
  if (filtros.equipamentoId) queryParams.set('equipamentoId', filtros.equipamentoId)
  if (filtros.dataInicio) queryParams.set('dataInicio', filtros.dataInicio)
  if (filtros.dataFim) queryParams.set('dataFim', filtros.dataFim)
  const url = `/api/equipamentos/importar/winaudit/logs?${queryParams.toString()}`
  const token = localStorage.getItem('authToken')
  window.open(`${import.meta.env.VITE_API_BASE_URL || ''}${url}${token ? (url.includes('?') ? '&' : '?') + `authToken=${encodeURIComponent(token)}` : ''}`, '_blank', 'noopener,noreferrer')
}

export default {
  listarLogsImportacao,
  obterLogImportacaoPorId,
  exportarRelatorioAuditoriaCSV,
}
