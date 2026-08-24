export type StatusCampoWinAudit =
  | 'ENCONTRADO'
  | 'NAO_ENCONTRADO'
  | 'INVALIDO'
  | 'POSSIVEL_DUPLICIDADE'

export interface WinAuditMacEntry {
  readonly valor: string
  readonly tipo: 'Ethernet' | 'Wi-Fi' | 'Bluetooth' | 'Virtual' | 'Outro'
  readonly contexto?: string
}

export interface WinAuditDuplicidadeEntry {
  readonly tipo: 'serial' | 'mac' | 'nome'
  readonly campoValor: string
  readonly equipamentoId: string
  readonly nomeEquipamento: string
  readonly status: string
  readonly patrimonio?: string | null
  readonly bloqueio: boolean
}

export interface WinAuditDados {
  readonly nome: string
  readonly usuarioNome: string
  readonly fabricante: string
  readonly modeloOriginal: string
  readonly modelo: string
  readonly serial: string
  readonly macs: readonly WinAuditMacEntry[]
  readonly macPrincipal: string
  readonly processador: string
  readonly memoria: string
  readonly memoriaFormatada: string
  readonly memoriaMB?: number | null
  readonly dataAquisicao: string
  readonly dataAquisicaoFormatada: string
  readonly tipoSugerido: string
  readonly escolaId: string
}

export interface WinAuditMapeamentoWizard {
  readonly campoRelatorio: string
  readonly campoCadastro: string
  readonly valorEncontrado: string
  readonly status: StatusCampoWinAudit
}

export interface WinAuditPreviewResponse {
  readonly previewId: string
  readonly dados: WinAuditDados
  readonly camposStatus: Readonly<Record<string, StatusCampoWinAudit>>
  readonly camposNaoEncontrados: readonly string[]
  readonly avisos: readonly string[]
  readonly duplicidades: readonly WinAuditDuplicidadeEntry[]
  readonly possivelDuplicidade: boolean
  readonly bloqueioSerial: boolean
  readonly metadados?: {
    readonly labelsMatchCount?: number
    readonly tamanhoBytes?: number | null
    readonly arquivoOriginal?: string
    readonly mapeamentosWizard?: readonly WinAuditMapeamentoWizard[]
  }
}

export interface WinAuditConfirmarPayload {
  readonly previewId: string
  readonly equipamento: Readonly<Record<string, unknown>>
  readonly macSelecionado?: string
  readonly ignorarDuplicidade?: boolean
}

export interface WinAuditConfirmarResponse {
  readonly previewId: string
  readonly status: string
  readonly equipamento: Readonly<Record<string, unknown>>
  readonly escolaId?: string | null
  readonly duplicidades: readonly WinAuditDuplicidadeEntry[]
  readonly possivelDuplicidade: boolean
  readonly bloqueioSerialSuperado?: boolean
  readonly erros?: readonly string[] | null
}
