import type { StatusCampoWinAudit } from './winaudit'

export type TipoEquipamentoChromeOS = 'CHROMEBOOK'
export type StatusEquipamentoChromeOS = 'DISPONIVEL'

export type ChromeOSDuplicidadeTipo =
  | 'serial'
  | 'mac'
  | 'nome'
  | 'sourceExternalId'

export interface ChromeOSDuplicidadeEntry {
  readonly tipo: ChromeOSDuplicidadeTipo
  readonly campoValor: string
  readonly equipamentoId: string
  readonly nomeEquipamento: string
  readonly status: string
  readonly patrimonio?: string | null
  readonly bloqueio: boolean
}

export interface ChromeOSEscola {
  readonly id: string
  readonly nome: string
  readonly sigla?: string
}

export type ChromeOSCampoEditavel =
  | 'nome'
  | 'patrimonio'
  | 'usuarioNome'
  | 'escolaId'
  | 'modelo'
  | 'serial'
  | 'localizacao'
  | 'fabricante'
  | 'processador'
  | 'memoria'
  | 'dataAquisicao'

export type ChromeOSLoteCampo = Extract<
  ChromeOSCampoEditavel,
  'escolaId' | 'localizacao' | 'fabricante' | 'dataAquisicao'
>

export interface ChromeOSNormalizedInput {
  readonly nome: string
  readonly patrimonio: string | null
  readonly usuarioNome: string | null
  readonly escolaId: string | null
  readonly tipo: TipoEquipamentoChromeOS
  readonly status: StatusEquipamentoChromeOS
  readonly modelo: string
  readonly serial: string
  readonly localizacao: string | null
  readonly macaddress: string | null
  readonly observacoes: string | null
  readonly fabricante: string | null
  readonly processador: string | null
  readonly memoria: string | null
  readonly dataAquisicao: string
  readonly sourceExternalId: string | null
  readonly importMetadata?: Readonly<Record<string, unknown>> | null
}

export interface ChromeOSPreviewRow {
  readonly indice: number
  readonly selecionado: boolean
  readonly ignorarDuplicidade: boolean
  readonly escolaPendente: boolean
  readonly candidatosEscola: readonly ChromeOSEscola[]
  readonly escolaResolvidaId?: string | null
  readonly equipamento: ChromeOSNormalizedInput | null
  readonly camposStatus: Readonly<Record<string, StatusCampoWinAudit>>
  readonly duplicidades: readonly ChromeOSDuplicidadeEntry[]
  readonly bloqueioSerial: boolean
  readonly bloqueioSourceExternalId: boolean
  readonly avisos: readonly string[]
  readonly linhaInvalida?: boolean
  readonly erroMotivo?: string | null
  readonly logId?: string
}

export interface ChromeOSPreviewResponse {
  readonly previewId: string | null
  readonly arquivoOriginal: string
  readonly tamanhoBytes: number | null
  readonly linhas: readonly ChromeOSPreviewRow[]
  readonly totalLinhas: number
  readonly totalValidas: number
  readonly totalEscolasPendentes: number
  readonly totalDuplicidadesBloqueantes: number
  readonly avisosGerais: readonly string[]
  readonly tipoArquivo?: string | null
  readonly versaoImportador?: string | null
  readonly duracaoMs?: number | null
}

export interface ChromeOSConfirmarItem {
  readonly indiceLinha: number
  readonly selecionado: boolean
  readonly escolaResolvidaId: string | null
  readonly ignorarDuplicidade: boolean
  readonly overrides?: Readonly<Partial<ChromeOSNormalizedInput>>
}

export interface ChromeOSConfirmarPayload {
  readonly previewId: string
  readonly itens: readonly ChromeOSConfirmarItem[]
}

export interface ChromeOSConfirmarResultadoItem {
  readonly indiceLinha: number
  readonly status: 'SUCESSO' | 'CANCELADO' | 'ERRO'
  readonly equipamentoId?: string | null
  readonly equipamento?: Readonly<Record<string, unknown>> | null
  readonly erroMotivo?: string | null
  readonly duplicidades?: readonly ChromeOSDuplicidadeEntry[]
  readonly repetido?: boolean
}

export interface ChromeOSConfirmarResponse {
  readonly previewId: string
  readonly resultados: readonly ChromeOSConfirmarResultadoItem[]
  readonly totalSucesso: number
  readonly totalErros: number
  readonly totalCancelados: number
  readonly duracaoMs?: number | null
}
