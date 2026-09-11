import api from '../lib/axios'
import type {
  ChromeOSPreviewResponse,
  ChromeOSConfirmarPayload,
  ChromeOSConfirmarResponse,
} from '../types/chromeos'

export async function gerarPreviewChromeOS(
  file: File,
  escolaId?: string | null,
): Promise<ChromeOSPreviewResponse> {
  const fd = new FormData()
  fd.append('arquivo', file)
  if (escolaId) {
    fd.append('escolaId', escolaId)
  }
  const resp = await api.post('/api/equipamentos/importar/chromeos/preview', fd)
  return resp.data as ChromeOSPreviewResponse
}

export async function confirmarImportacaoChromeOS(
  payload: ChromeOSConfirmarPayload,
): Promise<ChromeOSConfirmarResponse> {
  const resp = await api.post('/api/equipamentos/importar/chromeos/confirmar', payload)
  return resp.data as ChromeOSConfirmarResponse
}

export interface ImportarChromeOSService {
  readonly gerarPreview: typeof gerarPreviewChromeOS
  readonly confirmar: typeof confirmarImportacaoChromeOS
}

const ImportarChromeOSService: ImportarChromeOSService = {
  gerarPreview: gerarPreviewChromeOS,
  confirmar: confirmarImportacaoChromeOS,
}

export default ImportarChromeOSService
