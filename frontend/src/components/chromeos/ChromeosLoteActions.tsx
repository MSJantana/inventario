import { useState } from 'react'
import { Layers, CheckCircle2 } from 'lucide-react'
import type { ChromeOSLoteCampo, ChromeOSNormalizedInput } from '../../types/chromeos'
import type { UseChromeosImportReturn } from '../../hooks/useChromeosImport'

type EscolaLite = { id: string; nome: string }

type Props = Pick<
  UseChromeosImportReturn,
  'crosSelecionadosCount' | 'aplicarValorEmLote'
> & {
  escolas: ReadonlyArray<EscolaLite>
}

type OpcaoLote = {
  key: ChromeOSLoteCampo
  label: string
  tipo: 'select-escola' | 'text' | 'date'
  placeholder?: string
}

const OPCOES: ReadonlyArray<OpcaoLote> = [
  { key: 'escolaId', label: 'Escola', tipo: 'select-escola' },
  { key: 'localizacao', label: 'Localização', tipo: 'text', placeholder: 'Ex.: Laboratório 01' },
  { key: 'fabricante', label: 'Fabricante', tipo: 'text', placeholder: 'Ex.: Samsung' },
  { key: 'dataAquisicao', label: 'Aquisição', tipo: 'date' },
]

export default function ChromeosLoteActions(props: Props) {
  const { crosSelecionadosCount, aplicarValorEmLote, escolas } = props
  const [campo, setCampo] = useState<ChromeOSLoteCampo>('escolaId')
  const [valorText, setValorText] = useState('')
  const [valorEscola, setValorEscola] = useState('')
  const [valorData, setValorData] = useState('')

  const opcao = OPCOES.find((o) => o.key === campo) || OPCOES[0]
  const desabilitado = crosSelecionadosCount === 0

  const handleAplicar = () => {
    let valor: ChromeOSNormalizedInput[ChromeOSLoteCampo] | null = null
    if (campo === 'escolaId') valor = valorEscola.length ? valorEscola : null
    else if (campo === 'dataAquisicao') valor = valorData.length ? valorData : null
    else valor = valorText.length ? valorText : null
    aplicarValorEmLote(campo, valor)
    setValorText('')
    setValorEscola('')
    setValorData('')
  }

  const renderControle = () => {
    if (opcao.tipo === 'select-escola') {
      return (
        <select
          disabled={desabilitado}
          value={valorEscola}
          onChange={(e) => setValorEscola(e.target.value)}
          className="h-9 flex-1 min-w-[220px] rounded-lg border border-slate-300 bg-white px-2 text-sm disabled:opacity-60"
        >
          <option value="">Selecione a escola...</option>
          {escolas.map((e) => (
            <option key={e.id} value={e.id}>{e.nome}</option>
          ))}
        </select>
      )
    }
    if (opcao.tipo === 'date') {
      return (
        <input
          disabled={desabilitado}
          type="date"
          value={valorData}
          onChange={(e) => setValorData(e.target.value)}
          className="h-9 flex-1 min-w-[220px] rounded-lg border border-slate-300 bg-white px-2 text-sm disabled:opacity-60"
        />
      )
    }
    return (
      <input
        disabled={desabilitado}
        type="text"
        placeholder={opcao.placeholder || ''}
        value={valorText}
        onChange={(e) => setValorText(e.target.value)}
        className="h-9 flex-1 min-w-[220px] rounded-lg border border-slate-300 bg-white px-2 text-sm disabled:opacity-60"
      />
    )
  }

  return (
    <div className="mb-4 rounded-2xl border-2 border-indigo-100 bg-white/70 p-3 sm:p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-slate-700">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
            <Layers size={18} aria-hidden />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Aplicar em lote</p>
            <p className="text-xs text-slate-500">
              {crosSelecionadosCount > 0
                ? `Afeta ${crosSelecionadosCount} linha(s) selecionada(s)`
                : 'Selecione linhas para usar ações em lote'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 ml-auto w-full md:w-auto">
          <select
            disabled={desabilitado}
            value={campo}
            onChange={(e) => setCampo(e.target.value as ChromeOSLoteCampo)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm disabled:opacity-60"
          >
            {OPCOES.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
          {renderControle()}
          <button
            type="button"
            disabled={desabilitado}
            onClick={handleAplicar}
            className="h-9 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
          >
            <CheckCircle2 size={16} aria-hidden /> Aplicar
          </button>
        </div>
      </div>
    </div>
  )
}
