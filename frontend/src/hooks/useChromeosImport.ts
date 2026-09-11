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

const mergeOverridesEmEquipamento = (
  base: ChromeOSNormalizedInput | null,
  overrides: Partial<ChromeOSNormalizedInput> | undefined,
): ChromeOSNormalizedInput | null => {
  if (!base || !overrides || Object.keys(overrides).length === 0) return base
  const saida: { -readonly [K in keyof ChromeOSNormalizedInput]: ChromeOSNormalizedInput[K] } = { ...base }
  for (const rawKey of Object.keys(overrides)) {
    const key = rawKey as ChromeOSCampoEditavel
    if (!CAMPOS_PERMITIDOS_OVERRIDE.has(key)) continue
    const val = overrides[key]
    if (key === 'dataAquisicao') {
      if (typeof val === 'string' && val.length > 0) saida.dataAquisicao = val
    } else if (key === 'escolaId' || key === 'patrimonio' || key === 'localizacao' || key === 'fabricante' || key === 'processador' || key === 'memoria' || key === 'usuarioNome') {
      ;(saida as unknown as Record<string, unknown>)[key] = (val == null || (typeof val === 'string' && val.length === 0)) ? null : val
    } else if (typeof val === 'string' && val.length > 0) {
      ;(saida as unknown as Record<string, unknown>)[key] = val
    }
  }
  return saida as ChromeOSNormalizedInput
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
          const novosOverrides: Partial<ChromeOSNormalizedInput> = { ...(r.overrides ?? undefined) }
          if (value == null || (typeof value === 'string' && value.length === 0)) {
            delete (novosOverrides as Record<string, unknown>)[key]
          } else {
            ;(novosOverrides as Record<string, unknown>)[key] = value
          }
          let novaLinha: PreviewRowDecorada = { ...r, overrides: Object.keys(novosOverrides).length ? novosOverrides : undefined }
          if (key === 'escolaId') {
            novaLinha = { ...novaLinha, escolaResolvidaId: typeof value === 'string' && value.length ? value : (novaLinha.escolaResolvidaId || null) }
          }
          const equipEf = mergeOverridesEmEquipamento(novaLinha.equipamento, novaLinha.overrides)
          const reSync = serializarPatrimonioNome(equipEf)
          if (reSync.nome || reSync.patrimonio) {
            const finalOverrides: { -readonly [K in keyof Partial<ChromeOSNormalizedInput>]: Partial<ChromeOSNormalizedInput>[K] } = { ...(novaLinha.overrides ?? undefined) }
            if (reSync.nome && reSync.nome !== r.equipamento?.nome) finalOverrides.nome = reSync.nome
            if (reSync.patrimonio !== null && reSync.patrimonio !== r.equipamento?.patrimonio) finalOverrides.patrimonio = reSync.patrimonio
            novaLinha = { ...novaLinha, overrides: Object.keys(finalOverrides).length ? finalOverrides : undefined }
          }
          return novaLinha
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
          const overrides: Partial<ChromeOSNormalizedInput> = { ...(r.overrides ?? undefined) }
          if (valor == null || (typeof valor === 'string' && valor.length === 0)) {
            delete (overrides as Record<string, unknown>)[campo as string]
          } else {
            ;(overrides as Record<string, unknown>)[campo as string] = valor
          }
          let nova: PreviewRowDecorada = { ...r, overrides: Object.keys(overrides).length ? overrides : undefined }
          if (campo === 'escolaId') {
            nova = { ...nova, escolaResolvidaId: typeof valor === 'string' && valor.length ? valor : (nova.escolaResolvidaId || null) }
          }
          return nova
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
