import type { ReactElement } from 'react'
import { useEffect, useRef, useState } from 'react'
import { FileDown, Printer, BookOpen, Monitor, Settings2, AlertTriangle, CheckCircle2, ArrowRightLeft, FileText } from 'lucide-react'
import LogoSystem from '../assets/Logo_System.svg'
import { APP_VERSION } from '../services/settings'

const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

type Secao = { id: string; titulo: string; nivel?: 1 | 2 | 3; render: () => ReactElement }

function escapeHtml(s: string | number | boolean | null | undefined) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function Painel({ children, className = '' }: Readonly<{ children: React.ReactNode; className?: string }>) {
  return (
    <section className={`mx-auto w-full max-w-4xl rounded-lg border border-gray-200 bg-white p-8 shadow-sm ${className}`}>
      {children}
    </section>
  )
}

function Secao({ id, children }: Readonly<{ id: string; children: React.ReactNode }>) {
  return <h1 id={id} className="scroll-mt-20 border-b-2 border-asrs pb-2 text-2xl font-extrabold text-gray-900 mt-10 first:mt-0">{children}</h1>
}
function SubSecao({ id, children }: Readonly<{ id: string; children: React.ReactNode }>) {
  return <h2 id={id} className="scroll-mt-20 mt-8 mb-3 text-xl font-bold text-gray-800">{children}</h2>
}
function Paragrafo({ children, className = '' }: Readonly<{ children: React.ReactNode; className?: string }>) {
  return <p className={`mb-3 leading-7 text-gray-700 text-[15px] ${className}`}>{children}</p>
}
function ListaComMarcadores({ children }: Readonly<{ children: React.ReactNode }>) {
  return <ul className="mb-3 ml-6 list-disc space-y-1.5 leading-7 text-gray-700 text-[15px]">{children}</ul>
}
function ListaNumerada({ children }: Readonly<{ children: React.ReactNode }>) {
  return <ol className="mb-3 ml-6 list-decimal space-y-1.5 leading-7 text-gray-700 text-[15px]">{children}</ol>
}
function ItemLista({ children }: Readonly<{ children: React.ReactNode }>) {
  return <li>{children}</li>
}
function Etiqueta({ cor, children }: Readonly<{ cor: 'green' | 'blue' | 'yellow' | 'red' | 'gray'; children: React.ReactNode }>) {
  const cls = {
    green: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20',
    blue: 'bg-blue-100 text-blue-800 ring-blue-600/20',
    yellow: 'bg-amber-100 text-amber-800 ring-amber-600/20',
    red: 'bg-rose-100 text-rose-800 ring-rose-600/20',
    gray: 'bg-slate-100 text-slate-700 ring-slate-600/20',
  }[cor]
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${cls}`}>{children}</span>
}

function Celula({ children, header = false }: Readonly<{ children: React.ReactNode; header?: boolean }>) {
  return <td className={`border border-gray-300 px-3 py-2 text-sm ${header ? 'bg-gray-900 text-white font-bold' : 'text-gray-800'}`}>{children}</td>
}

function TabelaPermissoes({ linhas }: Readonly<{ linhas: ReadonlyArray<{ tela: string; desc: string; admin: string; gestor: string; tecnico: string; usuario: string }> }>) {
  return (
    <div className="my-4 overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            <Celula header>Tela / Funcionalidade</Celula>
            <Celula header>DescriÃ§Ã£o</Celula>
            <Celula header>Admin</Celula>
            <Celula header>Gestor</Celula>
            <Celula header>TÃ©cnico</Celula>
            <Celula header>UsuÃ¡rio</Celula>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.tela}>
              <Celula><strong>{l.tela}</strong></Celula>
              <Celula>{l.desc}</Celula>
              <Celula>{l.admin}</Celula>
              <Celula>{l.gestor}</Celula>
              <Celula>{l.tecnico}</Celula>
              <Celula>{l.usuario}</Celula>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Capa() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <img src={LogoSystem} alt="Logo ASRS" className="h-24 mb-6" />
      <Secao id="capa">Manual do Sistema de InventÃ¡rio</Secao>
      <p className="mt-2 text-lg text-gray-600">Controle Inteligente de Estoque Â· ASRS</p>
      <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 px-8 py-5 text-gray-700">
        <p><strong>VersÃ£o:</strong> {APP_VERSION}</p>
        <p><strong>Documento gerado em:</strong> {hoje}</p>
        <p><strong>PÃºblico-alvo:</strong> Administradores, Gestores, TÃ©cnicos e UsuÃ¡rios finais.</p>
      </div>
    </div>
  )
}

function Indice() {
  const itens: Array<{ id: string; label: string; sub?: Array<{ id: string; label: string }> }> = [
    { id: 'visao-geral', label: '1. VisÃ£o Geral', sub: [{ id: 'oq-sistema', label: '1.1 O que faz o sistema' }, { id: 'telas', label: '1.2 NavegaÃ§Ã£o e telas' }, { id: 'fluxo', label: '1.3 Fluxo tÃ­pico de operaÃ§Ã£o' }] },
    { id: 'autenticacao', label: '2. AutenticaÃ§Ã£o', sub: [{ id: 'login', label: '2.1 Login' }, { id: 'esqueci', label: '2.2 Esqueci / resetar senha' }] },
    { id: 'permissoes', label: '3. Perfis e permissÃµes', sub: [{ id: 'roles', label: '3.1 4 perfis de acesso' }, { id: 'matriz', label: '3.2 Matriz de permissÃµes' }] },
    { id: 'tela-equipamentos', label: '4. Tela: Equipamentos', sub: [{ id: 'eq-cadastro', label: '4.1 Cadastrar' }, { id: 'eq-editar', label: '4.2 Editar / excluir / doado' }, { id: 'eq-filtros', label: '4.3 Filtros e busca' }, { id: 'eq-status', label: '4.4 Status do equipamento' }, { id: 'eq-winaudit', label: '4.5 ImportaÃ§Ã£o WinAudit (Windows)' }, { id: 'eq-chromebook', label: '4.6 ImportaÃ§Ã£o Chromebook (CSV Google Admin)' }] },
    { id: 'tela-movimentacoes', label: '5. Tela: MovimentaÃ§Ãµes', sub: [{ id: 'mv-grupos', label: '5.1 Grupos e tipos' }, { id: 'mv-entrada', label: '5.2 Entrada' }, { id: 'mv-saida', label: '5.3 SaÃ­da' }, { id: 'mv-transferencia', label: '5.4 TransferÃªncia' }, { id: 'mv-manutencao', label: '5.5 ManutenÃ§Ã£o: Envio / Retorno / FormataÃ§Ã£o' }, { id: 'mv-estorno', label: '5.6 Estorno de movimentaÃ§Ã£o' }] },
    { id: 'tela-centro-midia', label: '6. Tela: Centro de MÃ­dia' },
    { id: 'tela-escolas', label: '7. Tela: Escolas' },
    { id: 'tela-auditoria', label: '8. Tela: Auditoria' },
    { id: 'tela-relatorios', label: '9. RelatÃ³rios', sub: [{ id: 'rel-equip', label: '9.1 RelatÃ³rio de Equipamentos (lista)' }, { id: 'rel-equip-sing', label: '9.2 RelatÃ³rio singular de equipamento' }, { id: 'rel-mov', label: '9.3 RelatÃ³rio de MovimentaÃ§Ãµes' }, { id: 'rel-impressao', label: '9.4 ImpressÃ£o em PDF / impressora (40 linhas por pÃ¡gina)' }] },
    { id: 'tela-usuarios', label: '10. Tela: UsuÃ¡rios' },
    { id: 'tela-config', label: '11. Tela: ConfiguraÃ§Ãµes (Admin/Gestor)', sub: [{ id: 'cfg-seguranca', label: '11.1 SeguranÃ§a (Doado)' }, { id: 'cfg-permissoes', label: '11.2 PermissÃµes (botÃ£o Editar)' }, { id: 'cfg-func', label: '11.3 Funcionalidades (Chromebook CSV)' }, { id: 'cfg-validade', label: '11.4 Validade do equipamento' }, { id: 'cfg-api', label: '11.5 API base URL e token' }] },
    { id: 'novidades', label: '12. Novidades da versÃ£o 1.2.9' },
    { id: 'faq', label: '13. FAQ e resoluÃ§Ã£o de problemas' },
    { id: 'suporte', label: '14. Suporte' },
  ]
  return (
    <>
      <Secao id="indice">Ãndice</Secao>
      <nav>
        <ol className="ml-0 list-none space-y-2 leading-7 text-[15px]">
          {itens.map((i) => (
            <li key={i.id}>
              <a href={`#${i.id}`} className="font-semibold text-blue-700 hover:underline">{i.label}</a>
              {i.sub && (
                <ol className="mt-1 ml-6 list-none space-y-1">
                  {i.sub.map((s) => (
                    <li key={s.id}><a href={`#${s.id}`} className="text-gray-700 hover:underline">{s.label}</a></li>
                  ))}
                </ol>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  )
}

function VisaoGeral() {
  return (
    <>
      <Secao id="visao-geral">1. VisÃ£o Geral</Secao>
      <SubSecao id="oq-sistema">1.1 O que faz o sistema</SubSecao>
      <Paragrafo>O <strong>Sistema de InventÃ¡rio ASRS</strong> controla todo o ciclo de vida de equipamentos (notebooks, computadores, chromebooks, projetores) nas escolas e setores administrativos:</Paragrafo>
      <ListaComMarcadores>
        <ItemLista>Cadastro completo de equipamento com PatrimÃ´nio, NÃºmero de SÃ©rie, Modelo, LocalizaÃ§Ã£o, UsuÃ¡rio e SituaÃ§Ã£o.</ItemLista>
        <ItemLista>Controle de movimentaÃ§Ãµes: Entrada, SaÃ­da, TransferÃªncia, ManutenÃ§Ã£o (Envio/Retorno) e <strong>FormataÃ§Ã£o</strong> (altera nome do equipamento).</ItemLista>
        <ItemLista>ImportaÃ§Ãµes automatizadas via <em>WinAudit</em> (Windows XML) e <em>Chromebook CSV Google Admin</em>.</ItemLista>
        <ItemLista>RelatÃ³rios de equipamentos e movimentaÃ§Ãµes com impressÃ£o multi-pÃ¡ginas (40 linhas/pÃ¡gina).</ItemLista>
        <ItemLista>Auditoria de aÃ§Ãµes e trilha de alteraÃ§Ãµes dos equipamentos.</ItemLista>
      </ListaComMarcadores>
      <SubSecao id="telas">1.2 NavegaÃ§Ã£o e telas</SubSecao>
      <TabelaPermissoes linhas={[
        { tela: 'InÃ­cio Â· /equipamentos', desc: 'Tela principal: lista de equipamentos', admin: 'âœ…', gestor: 'âœ…', tecnico: 'âœ…', usuario: 'âœ…' },
        { tela: 'MovimentaÃ§Ãµes Â· /movimentacoes', desc: 'Nova movimentaÃ§Ã£o e listagem', admin: 'âœ…', gestor: 'âœ…', tecnico: 'âœ…', usuario: 'âœ…' },
        { tela: 'Centro de MÃ­dia Â· /centro-midia', desc: 'Controle do departamento de mÃ­dia', admin: 'âœ…', gestor: 'âœ…', tecnico: 'âœ…', usuario: 'âœ…' },
        { tela: 'Escolas Â· /escolas', desc: 'Cadastro/ediÃ§Ã£o de escolas', admin: 'âœ…', gestor: 'âœ…', tecnico: 'âœ…', usuario: 'âœ…' },
        { tela: 'Auditoria Â· /auditoria', desc: 'Trilha de logs e histÃ³ricos', admin: 'âœ…', gestor: 'âœ…', tecnico: 'âœ…', usuario: 'âœ…' },
        { tela: 'RelatÃ³rios (submenu)', desc: 'Equipamentos / MovimentaÃ§Ãµes', admin: 'âœ…', gestor: 'âœ…', tecnico: 'âœ…', usuario: 'âœ…' },
        { tela: 'UsuÃ¡rios Â· /usuarios', desc: 'Cadastro de usuÃ¡rios do sistema', admin: 'âœ…', gestor: 'âœ…', tecnico: 'âŒ', usuario: 'âŒ' },
        { tela: 'ConfiguraÃ§Ãµes Â· /config', desc: 'Switches e chaves globais', admin: 'âœ…', gestor: 'âœ…', tecnico: 'âŒ', usuario: 'âŒ' },
      ]} />
      <SubSecao id="fluxo">1.3 Fluxo tÃ­pico de operaÃ§Ã£o</SubSecao>
      <ListaNumerada>
        <ItemLista>Cadastrar a escola (se for nova) em <strong>Escolas</strong>.</ItemLista>
        <ItemLista>Cadastrar equipamento em <strong>Equipamentos</strong> (ou importar em lote).</ItemLista>
        <ItemLista>Usar <strong>MovimentaÃ§Ãµes Â· Entrada</strong> para registrar o recebimento de equipamentos novos ou formatados.</ItemLista>
        <ItemLista>Usar <strong>TransferÃªncia</strong> quando o equipamento mudar de escola / usuÃ¡rio.</ItemLista>
        <ItemLista>Usar <strong>ManutenÃ§Ã£o Â· FormataÃ§Ã£o</strong> antes de reatribuir o equipamento.</ItemLista>
        <ItemLista>Gerar <strong>RelatÃ³rios</strong> e exportar em PDF.</ItemLista>
      </ListaNumerada>
    </>
  )
}

function Autenticacao() {
  return (
    <>
      <Secao id="autenticacao">2. AutenticaÃ§Ã£o</Secao>
      <SubSecao id="login">2.1 Login</SubSecao>
      <ListaNumerada>
        <ItemLista>Acesse a pÃ¡gina <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm">/login</code>.</ItemLista>
        <ItemLista>Informe e-mail corporativo e senha.</ItemLista>
        <ItemLista>Clique em <strong>Entrar</strong>. O token Bearer Ã© salvo automaticamente e expira conforme polÃ­tica da instituiÃ§Ã£o.</ItemLista>
      </ListaNumerada>
      <SubSecao id="esqueci">2.2 Esqueci / resetar senha</SubSecao>
      <ListaComMarcadores>
        <ItemLista>Em <code>/forgot-password</code>, informe o e-mail cadastrado â†’ link de recuperaÃ§Ã£o Ã© enviado.</ItemLista>
        <ItemLista>Abra o link, crie uma nova senha (mÃ­nimo 6 caracteres, confirmaÃ§Ã£o) em <code>/reset-password</code>.</ItemLista>
      </ListaComMarcadores>
      <Paragrafo><Etiqueta cor="yellow"><AlertTriangle className="h-3 w-3 mr-1 inline" />Aviso</Etiqueta>&nbsp; Caso o link nÃ£o chegue em atÃ© 5 minutos, verifique a caixa de spam ou contate seu gestor.</Paragrafo>
    </>
  )
}

function Permissoes() {
  return (
    <>
      <Secao id="permissoes">3. Perfis e permissÃµes</Secao>
      <SubSecao id="roles">3.1 4 perfis de acesso</SubSecao>
      <ListaComMarcadores>
        <ItemLista><Etiqueta cor="red">ADMIN</Etiqueta>&nbsp; Super usuÃ¡rio: acesso total (todas as telas, todas as aÃ§Ãµes, inclusive UsuÃ¡rios e ConfiguraÃ§Ãµes).</ItemLista>
        <ItemLista><Etiqueta cor="blue">GESTOR</Etiqueta>&nbsp; Gerencia a instituiÃ§Ã£o: cadastra edita exclui equipamentos/escolas; aprova movimentaÃ§Ãµes; configura chaves globais (exceto criar outro ADMIN).</ItemLista>
        <ItemLista><Etiqueta cor="yellow">TÃ‰CNICO</Etiqueta>&nbsp; Executa operaÃ§Ãµes de campo: cadastra, edita, faz manutenÃ§Ã£o/formataÃ§Ã£o, gera relatÃ³rios. NÃ£o exclui.</ItemLista>
        <ItemLista><Etiqueta cor="gray">USUÃRIO</Etiqueta>&nbsp; Apenas visualiza equipamentos e relatÃ³rios (leitura).</ItemLista>
      </ListaComMarcadores>
      <SubSecao id="matriz">3.2 Matriz de permissÃµes</SubSecao>
      <TabelaPermissoes linhas={[
        { tela: 'Criar equipamento', desc: 'Incluir novo registro', admin: 'âœ…', gestor: 'âœ…', tecnico: 'âœ…', usuario: 'âŒ' },
        { tela: 'Editar equipamento', desc: 'Editar campos existentes (switch em Config, padrÃ£o OFF)', admin: 'âœ…', gestor: 'âœ…Â¹', tecnico: 'âœ…Â¹', usuario: 'âŒ' },
        { tela: 'Excluir equipamento', desc: 'Remover registro', admin: 'âœ…', gestor: 'âœ…', tecnico: 'âŒ', usuario: 'âŒ' },
        { tela: 'Editar/excluir DOADO', desc: 'Bloqueio global padrÃ£o ON', admin: 'âœ…', gestor: 'âœ…Â²', tecnico: 'âŒÂ²', usuario: 'âŒ' },
        { tela: 'Criar movimentaÃ§Ã£o', desc: 'Entrada / SaÃ­da / TransferÃªncia / ManutenÃ§Ã£o', admin: 'âœ…', gestor: 'âœ…', tecnico: 'âœ…', usuario: 'âŒ' },
        { tela: 'Estornar movimentaÃ§Ã£o', desc: 'Desfazer e marcar', admin: 'âœ…', gestor: 'âœ…', tecnico: 'âŒ', usuario: 'âŒ' },
        { tela: 'RelatÃ³rios e impressÃ£o', desc: 'Gerar e imprimir relatÃ³rios', admin: 'âœ…', gestor: 'âœ…', tecnico: 'âœ…', usuario: 'âœ…' },
        { tela: 'Tela UsuÃ¡rios', desc: 'Cadastrar usuÃ¡rios', admin: 'âœ…', gestor: 'âœ…', tecnico: 'âŒ', usuario: 'âŒ' },
        { tela: 'Tela ConfiguraÃ§Ãµes', desc: 'Ajustar chaves globais', admin: 'âœ…', gestor: 'âœ…', tecnico: 'âŒ', usuario: 'âŒ' },
      ]} />
      <Paragrafo className="text-sm italic">
        Â¹ Switch <strong>PermissÃµes Â· Habilitar botÃ£o Editar</strong> na tela ConfiguraÃ§Ãµes â€” padrÃ£o <strong>DESLIGADO</strong>. Ao desligado, botÃµes Editar em Equipamentos ficam ocultos. Â² Chave <strong>SeguranÃ§a Â· Bloquear Editar/Excluir Doado</strong> â€” padrÃ£o <strong>LIGADO</strong>.
      </Paragrafo>
    </>
  )
}

function TelaEquipamentos() {
  return (
    <>
      <Secao id="tela-equipamentos">4. Tela: Equipamentos</Secao>
      <Paragrafo>Tela principal do sistema. Clique no atalho <Monitor className="h-3 w-3 inline mx-1" /> <em>Equipamentos</em> no menu lateral esquerdo.</Paragrafo>
      <SubSecao id="eq-cadastro">4.1 Cadastrar um equipamento</SubSecao>
      <ListaNumerada>
        <ItemLista>Clique no botÃ£o azul <strong>â€œ+ Novo Equipamentoâ€</strong> no topo.</ItemLista>
        <ItemLista>Preencha os campos obrigatÃ³rios: Nome, Tipo, Escola, Modelo, NÃºmero de SÃ©rie, LocalizaÃ§Ã£o, UsuÃ¡rio, AquisiÃ§Ã£o, SituaÃ§Ã£o.</ItemLista>
        <ItemLista>Campo <em>PatrimÃ´nio</em> opcional (usado para ativos etiquetados).</ItemLista>
        <ItemLista>Clique em <strong>Salvar</strong>. Toast verde confirma.</ItemLista>
      </ListaNumerada>
      <SubSecao id="eq-editar">4.2 Editar / excluir / marcar DOADO</SubSecao>
      <Paragrafo>Cada linha na tabela possui 3 aÃ§Ãµes Ã  direita:</Paragrafo>
      <ListaComMarcadores>
        <ItemLista>âœï¸ <strong>Editar</strong> â€” abre o formulÃ¡rio. <em>ObservaÃ§Ã£o: o botÃ£o sÃ³ aparece se o switch em ConfiguraÃ§Ãµes &gt; PermissÃµes estiver LIGADO (padrÃ£o desligado).</em></ItemLista>
        <ItemLista>ðŸ—‘ï¸ <strong>Excluir</strong> â€” remove o registro (confirmaÃ§Ã£o em 2 passos).</ItemLista>
        <ItemLista>ðŸ–¨ï¸ <strong>RelatÃ³rio singular</strong> â€” abre a ficha completa daquele equipamento.</ItemLista>
      </ListaComMarcadores>
      <Paragrafo><Etiqueta cor="yellow">SeguranÃ§a Doado</Etiqueta>&nbsp; Equipamentos marcados com SituaÃ§Ã£o = <strong>DOADO</strong> tem Editar e Excluir bloqueados por padrÃ£o (ver 11.1).</Paragrafo>
      <SubSecao id="eq-filtros">4.3 Filtros e busca</SubSecao>
      <ListaComMarcadores>
        <ItemLista>Departamento: Equipamentos / Centro de MÃ­dia.</ItemLista>
        <ItemLista>Status: DISPONÃVEL, EM_USO, RESERVADO, EM_MANUTENÃ‡ÃƒO, DOADO, DESCARTE, FORMATADO.</ItemLista>
        <ItemLista>Tipo: NOTEBOOK, COMPUTADOR, CHROMEBOOK, PROJETOR, IMPRESSORA, OUTRO.</ItemLista>
        <ItemLista>Escola: dropdown por escola cadastrada.</ItemLista>
        <ItemLista>Busca por texto: nome, patrimÃ´nio, serial, usuÃ¡rio.</ItemLista>
      </ListaComMarcadores>
      <SubSecao id="eq-status">4.4 Status do equipamento</SubSecao>
      <ListaComMarcadores>
        <ItemLista><Etiqueta cor="green">DISPONÃVEL</Etiqueta> â€” pronto para uso, sem responsÃ¡vel.</ItemLista>
        <ItemLista><Etiqueta cor="blue">EM_USO</Etiqueta> â€” atribuÃ­do a um usuÃ¡rio / localizaÃ§Ã£o.</ItemLista>
        <ItemLista><Etiqueta cor="yellow">RESERVADO</Etiqueta> â€” aguardando uso.</ItemLista>
        <ItemLista><Etiqueta cor="gray">EM_MANUTENÃ‡ÃƒO</Etiqueta> â€” fora do ar / laboratÃ³rio.</ItemLista>
        <ItemLista><Etiqueta cor="red">DESCARTADO</Etiqueta> â€” inutilizado, fim de vida.</ItemLista>
        <ItemLista><Etiqueta cor="red">DOADO</Etiqueta> â€” doado; bloqueio de editar/excluir padrÃ£o.</ItemLista>
        <ItemLista><Etiqueta cor="gray">ðŸ–¥ï¸ FORMATADO</Etiqueta> â€” recÃ©m-formatado, pronto para nova atribuiÃ§Ã£o.</ItemLista>
      </ListaComMarcadores>
      <SubSecao id="eq-winaudit">4.5 ImportaÃ§Ã£o WinAudit (Windows)</SubSecao>
      <ListaNumerada>
        <ItemLista>Selecione um relatório HTML (.html ou .htm) gerado pelo WinAudit. Se o equipamento já estiver cadastrado, revise os valores atuais e importados, escolha os campos que deseja atualizar e confirme pelo toast padrão do sistema.</ItemLista>
        <ItemLista>Para equipamentos já cadastrados, compare valores atuais e importados, selecione os campos a atualizar e confirme pelo toast padrão do sistema.</ItemLista>
        <ItemLista>Campos vazios não apagam dados. Patrimônio, escola, status e localização administrativa permanecem intactos. Sem diferenças, não há atualização nem duplicação.</ItemLista>
      </ListaNumerada>
      <SubSecao id="eq-chromebook">4.6 ImportaÃ§Ã£o Chromebook (CSV Google Admin)</SubSecao>
      <Paragrafo>Esta funcionalidade depende do switch em <strong>ConfiguraÃ§Ãµes &gt; Funcionalidades &gt; Chromebook CSV</strong> (padrÃ£o LIGADO). Se desligado, backend retorna <em>403 Forbidden</em>.</Paragrafo>
      <ListaNumerada>
        <ItemLista>No Google Admin Console: Dispositivos &gt; Chrome &gt; Dispositivos &gt; Exportar CSV.</ItemLista>
        <ItemLista>No Sistema InventÃ¡rio, clique em <strong>â€œImportar Chromebook CSVâ€</strong>.</ItemLista>
        <ItemLista>As colunas padrÃ£o sÃ£o detectadas automaticamente: deviceId, serialNumber, model, status, annotatedUser, annotatedLocation, annotatedAssetId, lastSync, osVersion.</ItemLista>
        <ItemLista>Antes de confirmar, tabela de prÃ©-visualizaÃ§Ã£o mostra: âœ… criaÃ§Ã£o, âœï¸ atualizaÃ§Ã£o, âš ï¸ conflito (resolva manualmente).</ItemLista>
        <ItemLista>Clique em Confirmar. Chromebooks aparecem com tipo <em>CHROMEBOOK</em>.</ItemLista>
      </ListaNumerada>
    </>
  )
}

function TelaMovimentacoes() {
  return (
    <>
      <Secao id="tela-movimentacoes">5. Tela: MovimentaÃ§Ãµes</Secao>
      <Paragrafo>HistÃ³rico e criaÃ§Ã£o de movimentaÃ§Ãµes. Atalho <ArrowRightLeft className="h-3 w-3 inline mx-1" /> <em>MovimentaÃ§Ãµes</em>.</Paragrafo>
      <SubSecao id="mv-grupos">5.1 Grupos e tipos de movimentaÃ§Ã£o</SubSecao>
      <ListaComMarcadores>
        <ItemLista><strong>Entrada / SaÃ­da / TransferÃªncia</strong> (grupo MovimentaÃ§Ã£o geral).</ItemLista>
        <ItemLista><strong>ManutenÃ§Ã£o:</strong> Envio para manutenÃ§Ã£o, Retorno da manutenÃ§Ã£o, FormataÃ§Ã£o (novo na versÃ£o 1.2.7).</ItemLista>
      </ListaComMarcadores>
      <SubSecao id="mv-entrada">5.2 MovimentaÃ§Ã£o Â· ENTRADA</SubSecao>
      <Paragrafo>Equipamentos elegÃ­veis: status <Etiqueta cor="blue">EM_USO</Etiqueta> ou <Etiqueta cor="gray">FORMATADO</Etiqueta>.</Paragrafo>
      <ListaNumerada>
        <ItemLista>Selecione tipo Entrada.</ItemLista>
        <ItemLista>Equipamento: busque por nome / patrimÃ´nio / serial.</ItemLista>
        <ItemLista>Preencha Destino (escola), UsuÃ¡rio responsÃ¡vel, ObservaÃ§Ãµes.</ItemLista>
        <ItemLista>Salvar: equipamento volta para <Etiqueta cor="blue">EM_USO</Etiqueta>.</ItemLista>
      </ListaNumerada>
      <SubSecao id="mv-saida">5.3 SAÃDA</SubSecao>
      <Paragrafo>Elegibilidade: <Etiqueta cor="blue">EM_USO</Etiqueta>.</Paragrafo>
      <SubSecao id="mv-transferencia">5.4 TRANSFERÃŠNCIA</SubSecao>
      <Paragrafo>Muda escola/local/usuÃ¡rio sem retirar do status EM_USO. Origem e Destino editÃ¡veis.</Paragrafo>
      <SubSecao id="mv-manutencao">5.5 ManutenÃ§Ã£o: Envio Â· Retorno Â· FormataÃ§Ã£o</SubSecao>
      <ListaNumerada>
        <ItemLista><strong>Envio ManutenÃ§Ã£o</strong>: equipamento vai para <Etiqueta cor="gray">EM_MANUTENÃ‡ÃƒO</Etiqueta>. Campos: Origem, TÃ©cnico responsÃ¡vel, ObservaÃ§Ãµes defeito.</ItemLista>
        <ItemLista><strong>Retorno ManutenÃ§Ã£o</strong>: tira de <Etiqueta cor="gray">EM_MANUTENÃ‡ÃƒO</Etiqueta>; volta para status anterior ou novo destino.</ItemLista>
        <ItemLista><strong>FormataÃ§Ã£o ðŸ†• (v1.2.7)</strong>: usado quando HD Ã© limpo e SO reinstalado. <em>O equipamento pode receber um novo NOME</em>. Campos obrigatÃ³rios:
          <ListaComMarcadores>
            <ItemLista>Nome atual (somente leitura, auto-preenchido).</ItemLista>
            <ItemLista>Nome apÃ³s formataÃ§Ã£o (obrigatÃ³rio, com asterisco).</ItemLista>
            <ItemLista>ObservaÃ§Ãµes: imagem drivers instalados, serial Windows, partiÃ§Ã£o EFI, softwares de produtividade instalados etc.</ItemLista>
          </ListaComMarcadores>
          Resultado: equipamento fica com novo nome e status <Etiqueta cor="gray">ðŸ–¥ï¸ FORMATADO</Etiqueta>, pronto para nova atribuiÃ§Ã£o (Entrada).
        </ItemLista>
      </ListaNumerada>
      <SubSecao id="mv-estorno">5.6 Estorno de movimentaÃ§Ã£o</SubSecao>
      <Paragrafo>Apenas Admin/Gestor. Ao clicar em â€œEstornarâ€ na linha da movimentaÃ§Ã£o: Ã© pedido motivo e o status do equipamento volta ao estado anterior.</Paragrafo>
    </>
  )
}

function TelaCentroMidia() {
  return (
    <>
      <Secao id="tela-centro-midia">6. Tela: Centro de MÃ­dia</Secao>
      <Paragrafo>Departamento especÃ­fico para projetores, telas, sistemas de som, equipamentos de emprÃ©stimo. Filtro equivalente a <em>Departamento: Centro de MÃ­dia</em>. Todos os comandos de Equipamentos valem aqui.</Paragrafo>
    </>
  )
}

function TelaEscolas() {
  return (
    <>
      <Secao id="tela-escolas">7. Tela: Escolas</Secao>
      <ListaNumerada>
        <ItemLista>BotÃ£o <strong>â€œ+ Nova Escolaâ€</strong> cadastra: Nome, CÃ³digo INEP, MunicÃ­pio, EndereÃ§o, Telefone, Diretor(a).</ItemLista>
        <ItemLista>Lista Ã© buscÃ¡vel por nome / municÃ­pio.</ItemLista>
        <ItemLista>Escola usada em equipamento/movimentaÃ§Ã£o nÃ£o pode ser excluÃ­da sem desvincular antes.</ItemLista>
      </ListaNumerada>
    </>
  )
}

function TelaAuditoria() {
  return (
    <>
      <Secao id="tela-auditoria">8. Tela: Auditoria</Secao>
      <Paragrafo>Trilha de alteraÃ§Ãµes dos equipamentos, com: data/hora, usuÃ¡rio autor, aÃ§Ã£o (criar/editar/excluir), campo alterado, valor antigo, valor novo.</Paragrafo>
      <ListaComMarcadores>
        <ItemLista>Filtros: perÃ­odo, equipamento, usuÃ¡rio, tipo aÃ§Ã£o.</ItemLista>
        <ItemLista>ExportaÃ§Ã£o CSV (mesmo padrÃ£o dos demais relatÃ³rios).</ItemLista>
        <ItemLista>Auditoria Ã© <strong>imutÃ¡vel</strong>: nenhum usuÃ¡rio (mesmo Admin) consegue apagar um registro.</ItemLista>
      </ListaComMarcadores>
    </>
  )
}

function TelaRelatorios() {
  return (
    <>
      <Secao id="tela-relatorios">9. RelatÃ³rios</Secao>
      <SubSecao id="rel-equip">9.1 RelatÃ³rio de Equipamentos (lista)</SubSecao>
      <Paragrafo>Caminho: menu <FileText className="inline h-3 w-3 mx-1" /> RelatÃ³rios &gt; Equipamentos.</Paragrafo>
      <ListaNumerada>
        <ItemLista>Ajuste filtros (Departamento, Status, Tipo, Escola, busca por texto).</ItemLista>
        <ItemLista>BotÃ£o <strong>Imprimir / PDF</strong> abre overlay com prÃ©-visualizaÃ§Ã£o.</ItemLista>
        <ItemLista>DiÃ¡logo do navegador abre automaticamente; escolha impressora ou â€œSalvar como PDFâ€.</ItemLista>
      </ListaNumerada>
      <SubSecao id="rel-equip-sing">9.2 RelatÃ³rio singular de equipamento</SubSecao>
      <Paragrafo>AÃ§Ã£o da linha em Equipamentos ðŸ–¨ï¸ â€” ficha individual com foto/dados bÃ¡sicos e histÃ³rico de movimentaÃ§Ãµes daquele equipamento.</Paragrafo>
      <SubSecao id="rel-mov">9.3 RelatÃ³rio de MovimentaÃ§Ãµes</SubSecao>
      <Paragrafo>Filtros por perÃ­odo, escola, tipo de movimento, usuÃ¡rio, patrimÃ´nio, sÃ©rie, estornadas.</Paragrafo>
      <SubSecao id="rel-impressao">9.4 Regras de impressÃ£o (40 linhas por pÃ¡gina)</SubSecao>
      <ListaComMarcadores>
        <ItemLista>Automaticamente quebra em blocos de <strong>40 equipamentos / movimentaÃ§Ãµes por folha A4 paisagem</strong>.</ItemLista>
        <ItemLista>Todas as pÃ¡ginas repetem: logo ASRS, tÃ­tulo, filtros aplicados, rodapÃ©.</ItemLista>
        <ItemLista>RodapÃ© mostra <em>PÃ¡gina X de Y</em> e <em>Total da pÃ¡gina N | Geral: Y</em>.</ItemLista>
        <ItemLista>CabeÃ§alho da tabela (thead) e rodapÃ© (tfoot) sÃ£o repetidos tambÃ©m pelo prÃ³prio motor de impressÃ£o.</ItemLista>
        <ItemLista>Cor / fundo das linhas zebradas e cabeÃ§alho escuro sÃ£o preservados (print-color-adjust: exact).</ItemLista>
      </ListaComMarcadores>
      <Paragrafo><Etiqueta cor="green"><CheckCircle2 className="h-3 w-3 mr-1 inline" />Dica</Etiqueta>&nbsp; Para economizar tinta, desmarque a opÃ§Ã£o â€œCabeÃ§alhos e rodapÃ©sâ€ nas configuraÃ§Ãµes avanÃ§adas de impressÃ£o do navegador (os cabeÃ§alhos do relatÃ³rio jÃ¡ sÃ£o embutidos no HTML).</Paragrafo>
    </>
  )
}

function TelaUsuarios() {
  return (
    <>
      <Secao id="tela-usuarios">10. Tela: UsuÃ¡rios (Admin / Gestor)</Secao>
      <ListaNumerada>
        <ItemLista>BotÃ£o <strong>â€œ+ Novo UsuÃ¡rioâ€</strong>: Nome, E-mail, Senha inicial, Perfil (UsuÃ¡rio / TÃ©cnico / Gestor / Admin).</ItemLista>
        <ItemLista>Editar: altere nome / perfil / reset de senha.</ItemLista>
        <ItemLista>Excluir: usuÃ¡rio Ã© desativado (auditoria mantÃ©m os logs).</ItemLista>
      </ListaNumerada>
      <Paragrafo><Etiqueta cor="red">Aviso seguranÃ§a</Etiqueta>&nbsp; NÃ£o crie perfis de Admin para usuÃ¡rios de campo. Prefira Gestor ou TÃ©cnico.</Paragrafo>
    </>
  )
}

function TelaConfig() {
  return (
    <>
      <Secao id="tela-config">11. Tela: ConfiguraÃ§Ãµes (Admin / Gestor)</Secao>
      <Paragrafo>Atalho <Settings2 className="h-3 w-3 inline mx-1" /> Config. AlteraÃ§Ãµes sÃ£o salvas no <em>localStorage</em> do navegador, com chaves espelhadas no backend onde se aplica.</Paragrafo>
      <SubSecao id="cfg-seguranca">11.1 SeguranÃ§a</SubSecao>
      <ListaComMarcadores>
        <ItemLista><strong>Bloquear Editar / Excluir (equipamentos Doado)</strong> â€” padrÃ£o <Etiqueta cor="green">LIGADO</Etiqueta>. Evita alteraÃ§Ã£o/acidente em bens doados.</ItemLista>
      </ListaComMarcadores>
      <SubSecao id="cfg-permissoes">11.2 PermissÃµes</SubSecao>
      <ListaComMarcadores>
        <ItemLista><strong>Habilitar botÃ£o Editar em Equipamentos</strong> â€” padrÃ£o <Etiqueta cor="red">DESLIGADO</Etiqueta> (v1.2.7). Desligado: TÃ©cnicos e Gestores criam e movimentam mas nÃ£o editaram campos de equipamentos jÃ¡ cadastrados. <em>A tela MovimentaÃ§Ãµes mantÃ©m o botÃ£o Editar independentemente.</em></ItemLista>
      </ListaComMarcadores>
      <SubSecao id="cfg-func">11.3 Funcionalidades</SubSecao>
      <ListaComMarcadores>
        <ItemLista><strong>Habilitar importaÃ§Ã£o Chromebook CSV</strong> â€” padrÃ£o <Etiqueta cor="green">LIGADO</Etiqueta>. Desligar remove os botÃµes no frontend e valida no backend (403).</ItemLista>
      </ListaComMarcadores>
      <SubSecao id="cfg-validade">11.4 Validade do equipamento</SubSecao>
      <ListaComMarcadores>
        <ItemLista><strong>Anos de vida Ãºtil</strong> padrÃ£o 5 anos. Usado para cÃ¡lculo de equipamentos prÃ³ximos ao fim de vida.</ItemLista>
      </ListaComMarcadores>
      <SubSecao id="cfg-api">11.5 API base URL e token Bearer</SubSecao>
      <ListaComMarcadores>
        <ItemLista>Campos de configuraÃ§Ã£o de endpoint e token (permite trocar entre produÃ§Ã£o e homolog localmente). Sempre que alterar, clique em Salvar e recarregue a pÃ¡gina.</ItemLista>
      </ListaComMarcadores>
    </>
  )
}

function Novidades() {
  return (
    <>
      <Secao id="novidades">12. Novidades da versÃ£o 1.2.9</Secao>
      <ListaComMarcadores>
        <ItemLista><strong>Atualização inteligente via WinAudit:</strong> equipamentos existentes são comparados campo a campo. O usuário escolhe quais diferenças aplicar e confirma pelo toast padrão do sistema. Campos vazios não apagam valores e o cadastro não é duplicado.</ItemLista>
        <ItemLista><strong>BotÃ£o FormataÃ§Ã£o (ManutenÃ§Ã£o)</strong>: novo tipo de movimentaÃ§Ã£o FORMATACAO com 2 campos â€” Nome atual (readonly) e Nome apÃ³s formataÃ§Ã£o (obrigatÃ³rio). Status novo FORMATADO cyan. Deploy nos 2 hosts DB 10.12.0.9 e 10.12.3.231.</ItemLista>
        <ItemLista><strong>Entrada considera agora FORMATADO alÃ©m de EM_USO</strong> para elegibilidade.</ItemLista>
        <ItemLista><strong>Config Â· PermissÃµes switch novo</strong>: Habilitar botÃ£o Editar em Equipamentos â€” padrÃ£o DESLIGADO. (MantÃ©m editar em MovimentaÃ§Ãµes conforme requisito.)</ItemLista>
        <ItemLista><strong>ImpressÃ£o de relatÃ³rios (Patch 5)</strong>: 40 linhas fixas por pÃ¡gina, CSS robusto com page-break-before: always em pÃ¡ginas 2+ + seletor nativo div.page + div.page, disparo iframe.contentWindow.print(), remove deprecated execCommand (Sonar S1874 limpo).</ItemLista>
        <ItemLista><strong>SonarLint</strong>: S6551/S7744/S3358/S3776/S7762/S6582/S7758 tratados em impressÃ£o, toast, useChromeosImport, WinAuditImportService.</ItemLista>
      </ListaComMarcadores>
    </>
  )
}

function SecaoFAQ() {
  const perguntas = [
    { q: 'â€œBotÃµes Editar nÃ£o aparecem na tela Equipamentos.â€', r: 'Verifique ConfiguraÃ§Ãµes â†’ PermissÃµes â†’ Habilitar botÃ£o Editar. Por seguranÃ§a estÃ¡ DESLIGADO de fÃ¡brica na 1.2.7.' },
    { q: 'â€œPreview mostra 2 pÃ¡ginas, mas impressora sÃ³ imprime a primeira.â€', r: 'Use o disparo automÃ¡tico do botÃ£o Imprimir/PDF (iframe.contentWindow.print()). NÃ£o pressione Ctrl+P manualmente no overlay React â€” isso imprimiria o documento pai.' },
    { q: 'â€œNÃ£o consigo editar/excluir um equipamento DOADO.â€', r: 'Chave SeguranÃ§a Bloquear Doado estÃ¡ LIGADA por padrÃ£o. Desative temporariamente em ConfiguraÃ§Ãµes, faÃ§a a alteraÃ§Ã£o, depois religue.' },
    { q: 'â€œImportaÃ§Ã£o Chromebook retorna 403 Forbidden.â€', r: 'Switch Chromebook CSV em ConfiguraÃ§Ãµes estÃ¡ DESLIGADO. Ligue e recarregue a pÃ¡gina.' },
    { q: 'â€œPopup bloqueado ao imprimir.â€', r: 'AtualizaÃ§Ã£o 1.2.7 nÃ£o usa popup para impressÃ£o. Apenas overlay iframe. Se aparecer popup bloqueado, libere popups para o site na barra de endereÃ§o do Chrome.' },
    { q: 'â€œTentativa de movimentaÃ§Ã£o FORMATACAO retorna erro 400.â€', r: 'Campo â€œnomeFormatadoâ€ Ã© obrigatÃ³rio e â€œnomeAtualâ€ nÃ£o pode ser editado. Campos extras proibidos (400 FORMATACAO_CAMPOS_EXTRA).' },
  ]
  return (
    <>
      <Secao id="faq">13. FAQ e resoluÃ§Ã£o de problemas</Secao>
      <div className="space-y-4">
        {perguntas.map((p, i) => (
          <div key={`faq-${p.q.slice(0, 24).normalize('NFD').replace(/[^a-zA-Z0-9]/g, '-')}-${i}`} className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
            <p className="font-semibold text-gray-900 mb-1">Q{i + 1}. {p.q}</p>
            <p className="text-gray-700 leading-7">{p.r}</p>
          </div>
        ))}
      </div>
    </>
  )
}

function Suporte() {
  return (
    <>
      <Secao id="suporte">14. Suporte</Secao>
      <Paragrafo>Para dÃºvidas, erros ou novas solicitaÃ§Ãµes:</Paragrafo>
      <ListaComMarcadores>
        <ItemLista>Equipe ASRS: suporte interno.</ItemLista>
        <ItemLista>RepositÃ³rio: <code className="rounded bg-gray-100 px-1.5 py-0.5">github.com/MSJantana/inventario</code></ItemLista>
        <ItemLista>Reportar bugs: anexar print do erro, nome do usuÃ¡rio, tela, horÃ¡rio e qual navegador/versÃ£o.</ItemLista>
      </ListaComMarcadores>
      <Paragrafo className="text-sm italic text-gray-500 border-t pt-4">Fim do manual. Documento revisado para a versÃ£o {APP_VERSION}.</Paragrafo>
    </>
  )
}

const secoes: Secao[] = [
  { id: 'capa', titulo: 'Capa', render: () => <Painel className="!p-0 !border-none !shadow-none"><Capa /></Painel> },
  { id: 'indice', titulo: 'Ãndice', render: () => <Painel><Indice /></Painel> },
  { id: 'visao-geral', titulo: 'VisÃ£o Geral', render: () => <Painel><VisaoGeral /></Painel> },
  { id: 'autenticacao', titulo: 'AutenticaÃ§Ã£o', render: () => <Painel><Autenticacao /></Painel> },
  { id: 'permissoes', titulo: 'PermissÃµes', render: () => <Painel><Permissoes /></Painel> },
  { id: 'eq', titulo: 'Equipamentos', render: () => <Painel><TelaEquipamentos /></Painel> },
  { id: 'mv', titulo: 'MovimentaÃ§Ãµes', render: () => <Painel><TelaMovimentacoes /></Painel> },
  { id: 'cm', titulo: 'Centro de MÃ­dia', render: () => <Painel><TelaCentroMidia /></Painel> },
  { id: 'escolas', titulo: 'Escolas', render: () => <Painel><TelaEscolas /></Painel> },
  { id: 'aud', titulo: 'Auditoria', render: () => <Painel><TelaAuditoria /></Painel> },
  { id: 'rels', titulo: 'RelatÃ³rios', render: () => <Painel><TelaRelatorios /></Painel> },
  { id: 'users', titulo: 'UsuÃ¡rios', render: () => <Painel><TelaUsuarios /></Painel> },
  { id: 'cfg', titulo: 'ConfiguraÃ§Ãµes', render: () => <Painel><TelaConfig /></Painel> },
  { id: 'nov', titulo: 'Novidades v1.2.9', render: () => <Painel><Novidades /></Painel> },
  { id: 'faq', titulo: 'FAQ', render: () => <Painel><SecaoFAQ /></Painel> },
  { id: 'sup', titulo: 'Suporte', render: () => <Painel><Suporte /></Painel> },
]

function ManualSistemaPage() {
  const ref = useRef<HTMLDivElement | null>(null)
  const [idxAberto, setIdxAberto] = useState(true)

  useEffect(() => {
    if (location.hash) {
      requestAnimationFrame(() => {
        const el = document.getElementById(location.hash.slice(1))
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }, [])

  const htmlParaImpressao = (conteudoHtml: string) => `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Manual do Sistema - VersÃ£o ${escapeHtml(APP_VERSION)}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  html, body { margin:0; padding:0; font-family: Helvetica, Arial, sans-serif; color:#0f172a; background:#fff; }
  a { color:#1d4ed8; text-decoration: none; }
  h1 { font-size: 22px; font-weight: 800; color:#0f172a; border-bottom: 2px solid #0b4f9f; padding-bottom: 6px; margin: 18px 0 14px; page-break-after: avoid; }
  h2 { font-size: 17px; font-weight: 700; color:#0f172a; margin: 14px 0 8px; page-break-after: avoid; }
  h3 { font-size: 14px; font-weight: 700; color:#1e293b; margin: 10px 0 6px; page-break-after: avoid; }
  p, li { font-size: 12px; line-height: 1.55; }
  ul, ol { margin: 4px 0 10px; padding-left: 22px; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0 14px; font-size: 11px; page-break-inside: auto; }
  thead { display: table-header-group !important; }
  tfoot { display: table-footer-group !important; }
  th, td { border: 1px solid #cbd5e1; padding: 4px 6px; vertical-align: top; }
  thead th { background:#0f172a !important; color:#ffffff !important; font-weight:700; }
  code { font-family: Consolas, Menlo, monospace; font-size: 11px; background:#f1f5f9; padding: 1px 4px; border-radius:3px; }
  thead th, tfoot td, tbody tr td, h1, h2, h3 { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
</style>
</head>
<body>
${conteudoHtml}
</body>
</html>`

  const handleExportarPDF = () => {
    const node = ref.current
    if (!node) return
    const rootId = 'manual-print-root-' + Date.now().toString(36)
    const styleId = rootId + '-style'
    const printRoot = document.createElement('div')
    printRoot.id = rootId
    printRoot.dataset.printRoot = '1'
    Object.assign(printRoot.style, {
      position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
      margin: '0', padding: '0', backgroundColor: '#ffffff', zIndex: '2147483647',
      display: 'block', overflow: 'hidden', boxSizing: 'border-box',
    })
    const styleEl = document.createElement('style')
    styleEl.id = styleId
    styleEl.setAttribute('media', 'print')
    styleEl.textContent = `
      @media print {
        html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
        body > *:not([data-print-root="1"]) { display: none !important; }
        [data-print-root="1"], [data-print-root="1"] iframe {
          position: static !important; width: 100% !important; height: auto !important;
          max-width: none !important; max-height: none !important; border: none !important;
          padding: 0 !important; margin: 0 !important; display: block !important;
          background: #fff !important; z-index: 2147483647 !important;
          visibility: visible !important; overflow: visible !important;
        }
        [data-print-root="1"] iframe { width: 210mm !important; min-height: 297mm !important; }
      }
    `
    document.head.appendChild(styleEl)

    const tituloManual = 'Manual do Sistema de InventÃ¡rio ASRS'
    const partesConteudo: string[] = []
    const secoesChildren = Array.from(node.children)
    for (let i = 0; i < secoes.length && i < secoesChildren.length; i++) {
      if (i > 0) partesConteudo.push('<div style="break-before: page; page-break-before: always;"></div>')
      partesConteudo.push((secoesChildren[i] as HTMLElement).outerHTML)
    }
    const partes: string[] = [
      `<div style="text-align:center;padding:20mm 0 10mm;">
      <img style="height:64px;margin-bottom:14px;" src="${escapeHtml(LogoSystem)}" alt="Logo ASRS" />
      <h1 style="border:0;padding:0;margin:0;">${escapeHtml(tituloManual)}</h1>
      <p style="color:#475569;">Controle Inteligente de Estoque Â· ASRS</p>
      <div style="border:1px solid #cbd5e1;background:#f8fafc;padding:10px 14px;display:inline-block;margin-top:10px;text-align:left;font-size:12px;">
        <p><strong>VersÃ£o:</strong> ${escapeHtml(APP_VERSION)}</p>
        <p><strong>Gerado em:</strong> ${escapeHtml(hoje)}</p>
        <p><strong>PÃºblico-alvo:</strong> Administradores, Gestores, TÃ©cnicos e UsuÃ¡rios finais.</p>
      </div>
    </div>`,
      '<div style="page-break-after: always;"></div>',
      partesConteudo.join('\n'),
      `<div style="border-top:1px solid #cbd5e1;margin-top:24px;padding-top:4px;font-size:9.5px;color:#64748b;text-align:right;">Manual do Sistema de InventÃ¡rio ASRS Â· v${escapeHtml(APP_VERSION)}</div>`,
    ]
    const html = htmlParaImpressao(partes.join('\n'))

    const iframeEl = document.createElement('iframe')
    iframeEl.setAttribute('title', 'Manual do Sistema - PDF')
    iframeEl.setAttribute('frameborder', '0')
    iframeEl.setAttribute('marginheight', '0')
    iframeEl.setAttribute('marginwidth', '0')
    iframeEl.setAttribute('srcdoc', html)
    Object.assign(iframeEl.style, {
      position: 'relative', width: '100%', height: 'auto', minHeight: '100vh',
      border: 'none', display: 'block', overflow: 'auto', background: '#fff',
      boxSizing: 'border-box', margin: '0 auto',
    })

    printRoot.appendChild(iframeEl)
    document.body.appendChild(printRoot)

    const cleanup = () => {
      try { if (printRoot.parentNode) printRoot.remove() } catch { /* no-op */ }
      try { if (styleEl.parentNode) styleEl.remove() } catch { /* no-op */ }
    }

    const disparar = () => {
      try {
        const win = iframeEl.contentWindow
        if (!win) throw new Error('IFRAME_WINDOW')
        try { win.focus() } catch { /* no-op */ }
        setTimeout(() => {
          try { try { win.print() } catch { window.print() } } catch { /* no-op */ }
          setTimeout(cleanup, 2500)
        }, 1800)
      } catch { setTimeout(cleanup, 4000) }
    }

    let disparou = false
    const tentarDisparar = () => {
      if (disparou) return
      disparou = true
      disparar()
    }
    try { iframeEl.addEventListener('load', tentarDisparar, { once: true, passive: true }) } catch { /* no-op */ }
    setTimeout(tentarDisparar, 4000)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <BookOpen className="h-6 w-6 text-asrs shrink-0" />
            <div className="min-w-0">
              <h1 className="truncate text-lg font-extrabold text-gray-900 sm:text-xl">Manual do Sistema</h1>
              <p className="truncate text-xs text-gray-500">v{APP_VERSION} Â· {hoje}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIdxAberto((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 sm:hidden"
              aria-expanded={idxAberto}
            >
              Ãndice
            </button>
            <button
              type="button"
              onClick={handleExportarPDF}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Imprimir / Exportar PDF</span>
              <span className="sm:hidden"><FileDown className="h-4 w-4" /></span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl gap-6 px-4 py-6 sm:px-6">
        <aside className={`${idxAberto ? 'block' : 'hidden'} shrink-0 sm:block w-64`}>
          <div className="sticky top-20 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Navegar</p>
            <nav>
              <ol className="list-none space-y-1.5 text-sm">
                {secoes.map((s) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="block rounded px-2 py-1 text-gray-700 hover:bg-gray-100 hover:text-gray-900">
                      {s.titulo}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        </aside>

        <main ref={ref} id="manual-conteudo" className="min-w-0 flex-1 space-y-6">
          {secoes.map((s) => <div key={s.id}>{s.render()}</div>)}
        </main>
      </div>
    </div>
  )
}

export default ManualSistemaPage
