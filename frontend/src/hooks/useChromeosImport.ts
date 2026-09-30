import { useCallback, useMemo, useRef, useState } from 'react'
import type {
  ChromeOSCampoEditavel,
  ChromeOSConfirmarItem,
  ChromeOSConfirmarResponse,
  ChromeOSLoteCampo,
  ChromeOSNormalizedInput,
  ChromeOSPreviewResponse,
  ChromeOSPreviewRow,
} from '../types/chromeos'
import { confirmarImportacaoChromeOS, gerarPreviewChromeOS } from '../services/importarChromeOS'
import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
  showWarningToast,
} from '../utils/toast'

export type CrosFluxo = 'idle' | 'uploading' | 'review' | 'resultado'

type PreviewRowDecorada = ChromeOSPreviewRow & {
  selecionado: boolean
  escolaResolvidaId?: string | null
  ignorarDuplicidade: boolean
  overrides?: Partial<ChromeOSNormalizedInput>
}

export type UserRole = 'ADMIN' | 'GESTOR' | 'TECNICO' | 'PROFESSOR' | (string & {})

export type UseChromeosImportArgs = {
  escolaIdPadrao: string | null
  userRole: UserRole
  formatarMensagemErro: (e: unknown, padrao: string) => string
  aoFinalizar: () => Promise<void> | void
}

export type UseChromeosImportReturn = {
  crosFluxo: CrosFluxo
  setCrosFluxo: React.Dispatch<React.SetStateAction<CrosFluxo>>
  crosFile: File | null
  setCrosFile: React.Dispatch<React.SetStateAction<File | null>>
  crosFileRef: React.RefObject<HTMLInputElement | null>
  crosPreview: ChromeOSPreviewResponse | null
  setCrosPreview: React.Dispatch<React.SetStateAction<ChromeOSPreviewResponse | null>>
  crosRows: ReadonlyArray<PreviewRowDecorada>
  setCrosRows: React.Dispatch<React.SetStateAction<ReadonlyArray<PreviewRowDecorada>>>
  crosConfirmando: boolean
  setCrosConfirmando: React.Dispatch<React.SetStateAction<boolean>>
  crosResultado: ChromeOSConfirmarResponse | null
  setCrosResultado: React.Dispatch<React.SetStateAction<ChromeOSConfirmarResponse | null>>
  crosPage: number
  setCrosPage: React.Dispatch<React.SetStateAction<number>>
  crosPageSize: number
  crosTotalPages: number
  crosPagina: ReadonlyArray<PreviewRowDecorada>
  crosSelecionadosCount: number
  crosTemEscolaPendenteSelecionado: boolean
  crosEditIdx: number | null
  abrirEditorLinha: (idx: number) => void
  fecharEditorLinha: () => void
  clearCrosState: () => void
  toggleCrosRowSelecionado: (idx: number) => void
  setCrosRowEscola: (idx: number, escolaId: string) => void
  setCrosRowIgnorarDup: (idx: number, valor: boolean) => void
  setCrosRowField: <K extends ChromeOSCampoEditavel>(
    idx: number,
    key: K,
    value: ChromeOSNormalizedInput[K] | null,
  ) => void
  aplicarValorEmLote: <K extends ChromeOSLoteCampo>(campo: K, valor: ChromeOSNormalizedInput[K] | null) => void
  crosSelecionarTodos: () => void
  crosDesmarcarTodos: () => void
  crosMarcarPendencias: () => void
  onCrosFilePick: (file: File | null) => Promise<void>
  confirmarCrosImportacao: () => Promise<void>
}

const CAMPOS_PERMITIDOS_OVERRIDE: ReadonlySet<ChromeOSCampoEditavel> = new Set([
  'nome',
  'patrimonio',
  'usuarioNome',
  'escolaId',
  'modelo',
  'serial',
  'localizacao',
  'fabricante',
  'processador',
  'memoria',
  'dataAquisicao',
])

const CAMPOS_OVERRIDE_NAO_NULO: ReadonlySet<ChromeOSCampoEditavel> = new Set([
  'nome',
  'modelo',
  'serial',
  'dataAquisicao',
])

const CAMPOS_OVERRIDE_NULLABLE: ReadonlySet<ChromeOSCampoEditavel> = new Set([
  'escolaId',
  'patrimonio',
  'localizacao',
  'fabricante',
  'processador',
  'memoria',
  'usuarioNome',
])

const CAMPO_OVERRIDE_DATA: ChromeOSCampoEditavel = 'dataAquisicao'

const overrideValorVazio = (key: ChromeOSCampoEditavel, val: unknown): boolean => {
  if (val == null) return true
  if (typeof val !== 'string') return false
  if (val.length > 0) return false
  if (key === CAMPO_OVERRIDE_DATA) return true
  return CAMPOS_OVERRIDE_NULLABLE.has(key)
}

const aplicarOverrideNumaKey = (saida: Record<string, unknown>, key: ChromeOSCampoEditavel, val: unknown): void => {
  if (overrideValorVazio(key, val)) {
    if (CAMPOS_OVERRIDE_NULLABLE.has(key)) {
      saida[key] = null
      return
    }
    if (key === CAMPO_OVERRIDE_DATA) return
    return
  }
  saida[key] = val
}

const mergeOverridesEmEquipamento = (
  base: ChromeOSNormalizedInput | null,
  overrides: Partial<ChromeOSNormalizedInput> | undefined,
): ChromeOSNormalizedInput | null => {
  if (!base || !overrides) return base
  const hasOverride = Object.keys(overrides).some((rawKey) => CAMPOS_PERMITIDOS_OVERRIDE.has(rawKey as ChromeOSCampoEditavel))
  if (!hasOverride) return base
  const saida: Record<string, unknown> = { ...(base as unknown as Record<string, unknown>) }
  for (const rawKey of Object.keys(overrides)) {
    const key = rawKey as ChromeOSCampoEditavel
    if (!CAMPOS_PERMITIDOS_OVERRIDE.has(key)) continue
    if (CAMPOS_OVERRIDE_NAO_NULO.has(key) || CAMPOS_OVERRIDE_NULLABLE.has(key)) {
      aplicarOverrideNumaKey(saida, key, overrides[key])
    }
  }
  return saida as unknown as ChromeOSNormalizedInput
}

const serializarPatrimonioNome = (
  equip: ChromeOSNormalizedInput | null,
): { nome: string | null; patrimonio: string | null } => {
  if (!equip) return { nome: null, patrimonio: null }
  const suffix = equip.patrimonio || equip.serial || null
  return {
    nome: suffix ? `CB-${suffix}` : equip.nome,
    patrimonio: equip.patrimonio || null,
  }
}

const buildOverridesAjustados = (
  atuais: Partial<ChromeOSNormalizedInput> | undefined,
  key: ChromeOSCampoEditavel,
  value: unknown,
): Partial<ChromeOSNormalizedInput> | undefined => {
  const current = atuais ?? ({} as Partial<ChromeOSNormalizedInput>)
  const result: Record<string, unknown> = { ...(current as unknown as Record<string, unknown>) }
  if (overrideValorVazio(key, value)) {
    delete result[key]
  } else {
    result[key] = value
  }
  const existeKey = Object.keys(result).some(
    (k) => CAMPOS_PERMITIDOS_OVERRIDE.has(k as ChromeOSCampoEditavel),
  )
  return existeKey ? (result as unknown as Partial<ChromeOSNormalizedInput>) : undefined
}

const syncResolvedEscola = (
  linha: PreviewRowDecorada,
  overrides: Partial<ChromeOSNormalizedInput> | undefined,
): PreviewRowDecorada => {
  const novo: PreviewRowDecorada = { ...linha, overrides }
  const equipEf = mergeOverridesEmEquipamento(linha.equipamento, overrides)
  const escolaOverride = equipEf?.escolaId ?? null
  if (!escolaOverride) return novo
  return { ...novo, escolaResolvidaId: escolaOverride }
}

const syncNomePatrimonioNoOverride = (
  linha: PreviewRowDecorada,
  overridesIn: Partial<ChromeOSNormalizedInput> | undefined,
): Partial<ChromeOSNormalizedInput> | undefined => {
  const equipEf = mergeOverridesEmEquipamento(linha.equipamento, overridesIn)
  const reSync = serializarPatrimonioNome(equipEf)
  if (!reSync.nome && reSync.patrimonio === null) return overridesIn
  const baseOver = overridesIn ?? ({} as Partial<ChromeOSNormalizedInput>)
  const result: Record<string, unknown> = { ...(baseOver as unknown as Record<string, unknown>) }
  if (reSync.nome && reSync.nome !== linha.equipamento?.nome) result.nome = reSync.nome
  if (reSync.patrimonio !== null && reSync.patrimonio !== linha.equipamento?.patrimonio) {
    result.patrimonio = reSync.patrimonio
  }
  const existeKey = Object.keys(result).some(
    (k) => CAMPOS_PERMITIDOS_OVERRIDE.has(k as ChromeOSCampoEditavel),
  )
  return existeKey ? (result as unknown as Partial<ChromeOSNormalizedInput>) : undefined
}


export const useChromeosImport = ({
  escolaIdPadrao,
  userRole,
  formatarMensagemErro,
  aoFinalizar,
}: UseChromeosImportArgs): UseChromeosImportReturn => {
  const crosPageSize = 20
  const crosFileRef = useRef<HTMLInputElement | null>(null)

  const [crosFluxo, setCrosFluxo] = useState<CrosFluxo>('idle')
  const [crosFile, setCrosFile] = useState<File | null>(null)
  const [crosPreview, setCrosPreview] = useState<ChromeOSPreviewResponse | null>(null)
  const [crosRows, setCrosRows] = useState<ReadonlyArray<PreviewRowDecorada>>([])
  const [crosConfirmando, setCrosConfirmando] = useState(false)
  const [crosResultado, setCrosResultado] = useState<ChromeOSConfirmarResponse | null>(null)
  const [crosPage, setCrosPage] = useState(1)
  const [crosEditIdx, setCrosEditIdx] = useState<number | null>(null)

  const clearCrosState = useCallback(() => {
    setCrosFluxo('idle')
    setCrosFile(null)
    setCrosPreview(null)
    setCrosRows([])
    setCrosConfirmando(false)
    setCrosResultado(null)
    setCrosPage(1)
    setCrosEditIdx(null)
    if (crosFileRef.current) crosFileRef.current.value = ''
  }, [])

  const crosTotalPages = Math.max(1, Math.ceil(crosRows.length / crosPageSize))
  const crosPagina = useMemo(() => {
    const start = (crosPage - 1) * crosPageSize
    return crosRows.slice(start, start + crosPageSize)
  }, [crosRows, crosPage, crosPageSize])
  const crosSelecionadosCount = useMemo(
    () => crosRows.filter((r) => r.selecionado).length,
    [crosRows],
  )
  const crosTemEscolaPendenteSelecionado = useMemo(
    () => crosRows.some((r) => {
      if (!r.selecionado) return false
      const equipEf = mergeOverridesEmEquipamento(r.equipamento, r.overrides)
      const escolaFinal = r.escolaResolvidaId || equipEf?.escolaId || null
      return r.escolaPendente && !escolaFinal
    }),
    [crosRows],
  )

  const toggleCrosRowSelecionado = useCallback((idx: number) => {
    setCrosRows((ant) => ant.map((r, i) => (i === idx ? { ...r, selecionado: !r.selecionado } : r)))
  }, [])
  const setCrosRowEscola = useCallback((idx: number, escolaId: string) => {
    setCrosRows((ant) =>
      ant.map((r, i) => (i === idx ? { ...r, escolaResolvidaId: escolaId || undefined } : r)),
    )
  }, [])
  const setCrosRowIgnorarDup = useCallback((idx: number, valor: boolean) => {
    setCrosRows((ant) => ant.map((r, i) => (i === idx ? { ...r, ignorarDuplicidade: valor } : r)))
  }, [])
  const abrirEditorLinha = useCallback((idx: number) => {
    setCrosEditIdx(idx)
  }, [])
  const fecharEditorLinha = useCallback(() => {
    setCrosEditIdx(null)
  }, [])

  const setCrosRowField = useCallback(
    <K extends ChromeOSCampoEditavel>(
      idx: number,
      key: K,
      value: ChromeOSNormalizedInput[K] | null,
    ) => {
      if (!CAMPOS_PERMITIDOS_OVERRIDE.has(key)) return
      setCrosRows((ant) =>
        ant.map((r, i) => {
          if (i !== idx) return r
          const overridesAjustados = buildOverridesAjustados(r.overrides, key, value)
          const base = syncResolvedEscola(r, overridesAjustados)
          const overridesFinal = syncNomePatrimonioNoOverride(base, base.overrides)
          return { ...base, overrides: overridesFinal }
        }),
      )
    },
    [],
  )

  const aplicarValorEmLote = useCallback(
    <K extends ChromeOSLoteCampo>(campo: K, valor: ChromeOSNormalizedInput[K] | null) => {
      const sel = crosRows.filter((r) => r.selecionado).length
      if (sel === 0) {
        showWarningToast('Selecione pelo menos uma linha antes de aplicar em lote.')
        return
      }
      setCrosRows((ant) =>
        ant.map((r) => {
          if (!r.selecionado) return r
          const overridesAjustados = buildOverridesAjustados(r.overrides, campo, valor)
          return syncResolvedEscola(r, overridesAjustados)
        }),
      )
      showSuccessToast(`Valor aplicado em ${sel} linha(s) selecionada(s).`)
    },
    [crosRows],
  )

  const crosSelecionarTodos = useCallback(() => {
    setCrosRows((ant) => ant.map((r) => ({ ...r, selecionado: true })))
  }, [])
  const crosDesmarcarTodos = useCallback(() => {
    setCrosRows((ant) => ant.map((r) => ({ ...r, selecionado: false })))
  }, [])
  const crosMarcarPendencias = useCallback(() => {
    setCrosRows((ant) =>
      ant.map((r) => {
        if (r.escolaPendente && !r.escolaResolvidaId) return r
        if (r.bloqueioSerial || r.bloqueioSourceExternalId) {
          if (userRole !== 'ADMIN') return r
        }
        return { ...r, selecionado: true }
      }),
    )
  }, [userRole])

  const onCrosFilePick = useCallback(
    async (file: File | null) => {
      setCrosFile(file)
      if (!file) return
      const maxMb = 5
      if (file.size > maxMb * 1024 * 1024) {
        showWarningToast(`Arquivo muito grande. O tamanho máximo é ${maxMb} MB.`)
        setCrosFile(null)
        if (crosFileRef.current) crosFileRef.current.value = ''
        return
      }
      if (!/\.csv$/i.test(file.name)) {
        showWarningToast('Selecione um arquivo .csv exportado do Google Admin Console.')
        setCrosFile(null)
        if (crosFileRef.current) crosFileRef.current.value = ''
        return
      }
      try {
        setCrosFluxo('uploading')
        const preview = await gerarPreviewChromeOS(file, escolaIdPadrao)
        setCrosPreview(preview)
        const rowsDecoradas = preview.linhas.map((l) => {
          const equip = l.equipamento
          return {
            ...l,
            selecionado: !l.bloqueioSerial && !l.bloqueioSourceExternalId,
            escolaResolvidaId: l.escolaPendente ? null : (equip?.escolaId ?? null),
            ignorarDuplicidade: false,
            overrides: undefined,
          }
        })
        setCrosRows(rowsDecoradas)
        setCrosPage(1)
        setCrosResultado(null)
        setCrosEditIdx(null)
        setCrosFluxo('review')
        if (preview.avisosGerais && preview.avisosGerais.length > 0) {
          preview.avisosGerais.slice(0, 3).forEach((m) => showWarningToast(m))
        }
        const countDup = preview.linhas.filter(
          (l) => l.bloqueioSerial || l.bloqueioSourceExternalId,
        ).length
        if (countDup > 0) {
          showWarningToast(
            `${countDup} linha(s) bloqueada(s) por duplicidade de serial ou deviceId.`,
          )
        }
        const countPend =
          preview.totalEscolasPendentes ??
          preview.linhas.filter((l) => l.escolaPendente).length
        if (countPend > 0) {
          showInfoToast(`${countPend} linha(s) precisam de seleção manual de escola.`)
        }
      } catch (e: unknown) {
        showErrorToast(formatarMensagemErro(e, 'Falha ao processar CSV ChromeOS.'))
        clearCrosState()
      }
    },
    [escolaIdPadrao, formatarMensagemErro, clearCrosState],
  )

  const confirmarCrosImportacao = useCallback(async () => {
    if (!crosPreview?.previewId) {
      showWarningToast('Pré-visualização não disponível.')
      return
    }
    if (crosSelecionadosCount === 0) {
      showWarningToast('Nenhum item selecionado para importar.')
      return
    }
    if (crosTemEscolaPendenteSelecionado) {
      showWarningToast(
        'Existem itens selecionados com escola pendente. Selecione a escola antes de confirmar.',
      )
      return
    }
    try {
      setCrosConfirmando(true)
      const itens: ChromeOSConfirmarItem[] = crosRows
        .filter((r) => r.selecionado)
        .map((r) => {
          const equipEf = mergeOverridesEmEquipamento(r.equipamento, r.overrides)
          const escolaResolvida =
            (r.escolaResolvidaId ?? equipEf?.escolaId ?? r.equipamento?.escolaId) ?? null
          return {
            indiceLinha: r.indice,
            selecionado: true,
            escolaResolvidaId: escolaResolvida,
            ignorarDuplicidade: r.ignorarDuplicidade,
            overrides: r.overrides && Object.keys(r.overrides).length ? r.overrides : undefined,
          }
        })
      const resultado = await confirmarImportacaoChromeOS({
        previewId: crosPreview.previewId,
        itens,
      })
      setCrosResultado(resultado)
      setCrosFluxo('resultado')
      const sucesso = resultado.totalSucesso || 0
      const erros = resultado.totalErros || 0
      if (sucesso > 0) showSuccessToast(`${sucesso} Chromebook(s) importado(s) com sucesso.`)
      if (erros > 0) showErrorToast(`${erros} item(ns) não foram importados. Veja o detalhe.`)
      await aoFinalizar()
    } catch (e: unknown) {
      showErrorToast(formatarMensagemErro(e, 'Falha ao confirmar importação Chromebook.'))
    } finally {
      setCrosConfirmando(false)
    }
  }, [
    crosPreview,
    crosRows,
    crosSelecionadosCount,
    crosTemEscolaPendenteSelecionado,
    formatarMensagemErro,
    aoFinalizar,
  ])

  return {
    crosFluxo,
    setCrosFluxo,
    crosFile,
    setCrosFile,
    crosFileRef,
    crosPreview,
    setCrosPreview,
    crosRows,
    setCrosRows,
    crosConfirmando,
    setCrosConfirmando,
    crosResultado,
    setCrosResultado,
    crosPage,
    setCrosPage,
    crosPageSize,
    crosTotalPages,
    crosPagina,
    crosSelecionadosCount,
    crosTemEscolaPendenteSelecionado,
    crosEditIdx,
    abrirEditorLinha,
    fecharEditorLinha,
    clearCrosState,
    toggleCrosRowSelecionado,
    setCrosRowEscola,
    setCrosRowIgnorarDup,
    setCrosRowField,
    aplicarValorEmLote,
    crosSelecionarTodos,
    crosDesmarcarTodos,
    crosMarcarPendencias,
    onCrosFilePick,
    confirmarCrosImportacao,
  }
}

export default useChromeosImport
