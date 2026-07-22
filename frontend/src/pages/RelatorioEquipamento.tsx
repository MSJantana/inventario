import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, BadgeInfo, CalendarDays, MapPin, PackageSearch, ShieldCheck, UserRound } from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import api from '../lib/axios'
import { formatDate, isExpired } from '../utils/validity'
import { showErrorToast, showSuccessToast } from '../utils/toast'
import { toDataUrl } from '../utils/imageUtils'
import LogoAsrs from '../assets/Logo_ASRS.svg'
import LogoEa from '../assets/Logo_EA.svg'
import { RelatorioEquipamentoPDF } from '../components/relatorios/RelatorioEquipamentoPDF'

type Escola = {
  nome?: string
  sigla?: string
}

type Movimentacao = {
  id: string
  tipoMovimento?: string
  dataMovimento?: string
  observacoes?: string
  origem?: string
  destino?: string
  responsavel?: string
}

type EquipamentoRelatorio = {
  id: string
  nome?: string
  nomeEquipamento?: string
  patrimonio?: string
  usuarioNome?: string
  status?: string
  modelo?: string
  serial?: string
  dataAquisicao?: string
  localizacao?: string
  escola?: Escola
  movimentacoes?: Movimentacao[]
}

function getStatusClasses(status?: string, expired?: boolean): string {
  if (expired) return 'border-red-200 bg-red-50 text-red-700'

  switch (status) {
    case 'DISPONIVEL':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'EM_USO':
      return 'border-blue-200 bg-blue-50 text-blue-700'
    case 'EM_MANUTENCAO':
      return 'border-amber-200 bg-amber-50 text-amber-700'
    case 'DESCARTADO':
      return 'border-rose-200 bg-rose-50 text-rose-700'
    case 'RESERVADO':
      return 'border-violet-200 bg-violet-50 text-violet-700'
    default:
      return 'border-slate-200 bg-slate-100 text-slate-700'
  }
}

function getTipoClasses(tipo?: string): string {
  switch (tipo) {
    case 'ENTRADA':
      return 'bg-emerald-100 text-emerald-700'
    case 'SAIDA':
      return 'bg-red-100 text-red-700'
    case 'TRANSFERENCIA':
      return 'bg-blue-100 text-blue-700'
    case 'MANUTENCAO':
      return 'bg-amber-100 text-amber-700'
    case 'DESCARTE':
      return 'bg-slate-200 text-slate-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

function formatDateTime(value?: string): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('pt-BR')
}

function getEquipmentName(equipamento?: EquipamentoRelatorio | null): string {
  return equipamento?.nome || equipamento?.nomeEquipamento || 'Equipamento não identificado'
}

function getPatrimonio(patrimonio?: string): string {
  return patrimonio?.trim() || '00000'
}

function InfoCard({
  titulo,
  valor,
  detalhe,
}: Readonly<{ titulo: string; valor: string; detalhe?: string }>) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{titulo}</p>
      <p className="mt-2 text-lg font-semibold text-slate-900">{valor}</p>
      {detalhe ? <p className="mt-1 text-sm text-slate-500">{detalhe}</p> : null}
    </div>
  )
}

export default function RelatorioEquipamentoPage() {
  const { id } = useParams<{ id: string }>()
  const [equipamento, setEquipamento] = useState<EquipamentoRelatorio | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  useEffect(() => {
    async function carregarRelatorio() {
      if (!id) {
        setError('Equipamento inválido.')
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const resp = await api.get(`/api/equipamentos/${id}`)
        setEquipamento(resp.data || null)
      } catch (e: unknown) {
        const message =
          (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          (e as Error)?.message ||
          'Não foi possível carregar o relatório do equipamento.'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    void carregarRelatorio()
  }, [id])

  const historico = useMemo(() => {
    const lista = Array.isArray(equipamento?.movimentacoes) ? equipamento.movimentacoes : []
    return [...lista].sort((a, b) => {
      const first = new Date(b.dataMovimento || 0).getTime()
      const second = new Date(a.dataMovimento || 0).getTime()
      return first - second
    })
  }, [equipamento])

  const expired = isExpired(equipamento?.dataAquisicao)
  const statusLabel = expired ? 'VENCIDO' : (equipamento?.status || 'SEM STATUS')
  const statusClasses = getStatusClasses(equipamento?.status, expired)
  const equipamentoNome = getEquipmentName(equipamento)
  const patrimonio = getPatrimonio(equipamento?.patrimonio)
  const setor = equipamento?.localizacao || 'Não informado'
  const usuario = equipamento?.usuarioNome || 'Não atribuído'
  const escola = equipamento?.escola?.nome || 'Escola não definida'

  const handlePrint = () => {
    globalThis.print()
  }

  async function handlePDF() {
    if (!equipamento) {
      showErrorToast('Nenhum equipamento carregado para exportar.')
      return
    }

    try {
      setIsGeneratingPdf(true)
      const [logoTop, logoBottom] = await Promise.all([toDataUrl(LogoAsrs), toDataUrl(LogoEa)])

      const blob = await pdf(
        <RelatorioEquipamentoPDF
          equipamento={equipamento}
          historico={historico}
          logoTop={logoTop}
          logoBottom={logoBottom}
        />
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `relatorio_equipamento_${equipamento.id}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)

      showSuccessToast('PDF gerado com sucesso!')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      showErrorToast(`Erro ao gerar PDF: ${message}`)
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  if (loading) {
    return (
      <section className="min-h-[70vh] rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-xl">
        <div className="animate-pulse space-y-6">
          <div className="h-6 w-40 rounded bg-white/10" />
          <div className="h-32 rounded-[24px] bg-white/10" />
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="h-28 rounded-[24px] bg-white/10 lg:col-span-2" />
            <div className="h-28 rounded-[24px] bg-white/10" />
          </div>
          <div className="h-72 rounded-[24px] bg-white/10" />
        </div>
      </section>
    )
  }

  if (error || !equipamento) {
    return (
      <section className="rounded-[28px] border border-red-200 bg-red-50 p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-600">Relatório do equipamento</p>
            <h1 className="mt-2 text-2xl font-semibold text-red-900">Não foi possível abrir este relatório</h1>
            <p className="mt-2 max-w-2xl text-sm text-red-700">{error || 'Equipamento não encontrado.'}</p>
          </div>
          <Link
            to="/equipamentos"
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
          >
            <ArrowLeft size={16} />
            <span>Voltar para equipamentos</span>
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <div className="print:hidden flex flex-wrap gap-2">
        <button
          onClick={handlePrint}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 flex items-center gap-2"
        >
          <span>🖨️</span>
          <span className="hidden sm:inline">Imprimir</span>
        </button>
        <button
          onClick={() => void handlePDF()}
          disabled={isGeneratingPdf}
          className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 flex items-center gap-2"
        >
          <span>📄</span>
          <span className="hidden sm:inline">{isGeneratingPdf ? 'Gerando PDF...' : 'Exportar PDF'}</span>
          <span className="sm:hidden">{isGeneratingPdf ? 'PDF...' : 'PDF'}</span>
        </button>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-[0_24px_80px_rgba(15,23,42,0.35)]">
        <div className="bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.28),transparent_28%),radial-gradient(circle_at_left,rgba(16,185,129,0.14),transparent_22%)] p-6 md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <Link
                to="/equipamentos"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
              >
                <ArrowLeft size={16} />
                <span>Voltar para equipamentos</span>
              </Link>

              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
                  ID {equipamento.id}
                </span>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusClasses}`}>
                  {statusLabel.replaceAll('_', ' ')}
                </span>
              </div>

              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Relatório técnico do equipamento</p>
                <h1 className="mt-2 max-w-4xl text-3xl font-semibold leading-tight text-white md:text-4xl">
                  {equipamentoNome}
                </h1>
                <p className="mt-3 max-w-3xl text-sm text-slate-300 md:text-base">
                  Consulta operacional consolidada para auditoria, conferência patrimonial e rastreabilidade do equipamento.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:w-[360px] lg:grid-cols-1">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-300" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Escola</p>
                    <p className="text-sm font-semibold text-white">{escola}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-sky-300" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Aquisição</p>
                    <p className="text-sm font-semibold text-white">{formatDate(equipamento.dataAquisicao)}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-violet-300" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Setor</p>
                    <p className="text-sm font-semibold text-white">{setor}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <PackageSearch className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Cadastro</p>
              <h2 className="text-2xl font-semibold text-slate-900">Resumo do equipamento</h2>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <InfoCard titulo="Modelo" valor={equipamento?.modelo || 'Não informado'} detalhe="Modelo cadastrado no inventário" />
            <InfoCard titulo="Número de Série" valor={equipamento?.serial || 'Não informado'} detalhe="Serial principal do equipamento" />
            <InfoCard titulo="Número do Patrimônio" valor={patrimonio} detalhe="Fallback automático para 00000" />
            <InfoCard titulo="Data de Aquisição" valor={formatDate(equipamento?.dataAquisicao)} detalhe={expired ? 'Equipamento com validade vencida' : 'Dentro do período de validade'} />
            <InfoCard titulo="Setor" valor={setor} detalhe="Origem do campo localização" />
            <InfoCard titulo="Usuário" valor={usuario} detalhe="Responsável atual registrado" />
          </div>
        </article>

        <aside className="rounded-[28px] border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-white p-3 text-slate-700 shadow-sm">
              <BadgeInfo className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Contexto</p>
              <h2 className="text-2xl font-semibold text-slate-900">Informações complementares</h2>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Status atual</p>
              <div className="mt-3 flex items-center gap-3">
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${statusClasses}`}>
                  {statusLabel.replaceAll('_', ' ')}
                </span>
                <span className="text-sm text-slate-500">Pronto para consulta e auditoria</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Escola vinculada</p>
              <p className="mt-3 text-lg font-semibold text-slate-900">{escola}</p>
              <p className="mt-1 text-sm text-slate-500">{equipamento.escola?.sigla || 'Sem sigla cadastrada'}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Responsável atual</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="rounded-full bg-slate-100 p-2 text-slate-700">
                  <UserRound className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-900">{usuario}</p>
                  <p className="text-sm text-slate-500">Usuário associado ao cadastro</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Histórico do equipamento</p>
            <h2 className="text-2xl font-semibold text-slate-900">Linha do tempo operacional</h2>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {historico.length} registro(s) encontrado(s)
          </div>
        </div>

        {historico.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="text-lg font-semibold text-slate-900">Nenhuma movimentação registrada</p>
            <p className="mt-2 text-sm text-slate-500">O equipamento ainda não possui histórico operacional disponível.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {historico.map((item, index) => (
              <div key={item.id} className="relative rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
                {index !== historico.length - 1 ? (
                  <div className="absolute left-9 top-[88px] h-[calc(100%+20px)] w-px bg-slate-200" />
                ) : null}

                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex gap-4">
                    <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                      {index + 1}
                    </div>
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${getTipoClasses(item.tipoMovimento)}`}>
                          {(item.tipoMovimento || 'SEM TIPO').replaceAll('_', ' ')}
                        </span>
                        <span className="text-sm text-slate-500">{formatDateTime(item.dataMovimento)}</span>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-2xl border border-white bg-white p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Origem</p>
                          <p className="mt-2 text-sm font-medium text-slate-900">{item.origem || 'Não informada'}</p>
                        </div>
                        <div className="rounded-2xl border border-white bg-white p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Destino</p>
                          <p className="mt-2 text-sm font-medium text-slate-900">{item.destino || 'Não informado'}</p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white bg-white p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Descrição</p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">{item.observacoes || 'Sem observações registradas.'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 md:min-w-[200px]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Responsável</p>
                    <p className="mt-2 font-medium text-slate-900">{item.responsavel || 'Não informado'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  )
}
