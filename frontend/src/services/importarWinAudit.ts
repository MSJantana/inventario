import api from '../lib/axios'
import type {
  WinAuditPreviewResponse,
  WinAuditConfirmarPayload,
  WinAuditConfirmarResponse,
} from '../types/winaudit'

export async function gerarPreviewWinAudit(file: File, escolaId?: string | null): Promise<WinAuditPreviewResponse> {
  const fd = new FormData()
  fd.append('arquivo', file)
  if (escolaId) {
    fd.append('escolaId', escolaId)
  }
  const resp = await api.post('/api/equipamentos/importar/winaudit/preview', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return resp.data as WinAuditPreviewResponse
}

export async function confirmarImportacaoWinAudit(
  payload: WinAuditConfirmarPayload,
): Promise<WinAuditConfirmarResponse> {
  const resp = await api.post('/api/equipamentos/importar/winaudit/confirmar', payload)
  return resp.data as WinAuditConfirmarResponse
}

export interface ImportarWinAuditService {
  readonly gerarPreview: typeof gerarPreviewWinAudit
  readonly confirmar: typeof confirmarImportacaoWinAudit
}

const ImportarWinAuditService: ImportarWinAuditService = {
  gerarPreview: gerarPreviewWinAudit,
  confirmar: confirmarImportacaoWinAudit,
}

export default ImportarWinAuditService
