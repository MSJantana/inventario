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
            <Celula header>Descrição</Celula>
            <Celula header>Admin</Celula>
            <Celula header>Gestor</Celula>
            <Celula header>Técnico</Celula>
            <Celula header>Usuário</Celula>
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
      <Secao id="capa">Manual do Sistema de Inventário</Secao>
      <p className="mt-2 text-lg text-gray-600">Controle Inteligente de Estoque · ASRS</p>
      <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 px-8 py-5 text-gray-700">
        <p><strong>Versão:</strong> {APP_VERSION}</p>
        <p><strong>Documento gerado em:</strong> {hoje}</p>
        <p><strong>Público-alvo:</strong> Administradores, Gestores, Técnicos e Usuários finais.</p>
      </div>
    </div>
  )
}

function Indice() {
  const itens: Array<{ id: string; label: string; sub?: Array<{ id: string; label: string }> }> = [
    { id: 'visao-geral', label: '1. Visão Geral', sub: [{ id: 'oq-sistema', label: '1.1 O que faz o sistema' }, { id: 'telas', label: '1.2 Navegação e telas' }, { id: 'fluxo', label: '1.3 Fluxo típico de operação' }] },
    { id: 'autenticacao', label: '2. Autenticação', sub: [{ id: 'login', label: '2.1 Login' }, { id: 'esqueci', label: '2.2 Esqueci / resetar senha' }] },
    { id: 'permissoes', label: '3. Perfis e permissões', sub: [{ id: 'roles', label: '3.1 4 perfis de acesso' }, { id: 'matriz', label: '3.2 Matriz de permissões' }] },
    { id: 'tela-equipamentos', label: '4. Tela: Equipamentos', sub: [{ id: 'eq-cadastro', label: '4.1 Cadastrar' }, { id: 'eq-editar', label: '4.2 Editar / excluir / doado' }, { id: 'eq-filtros', label: '4.3 Filtros e busca' }, { id: 'eq-status', label: '4.4 Status do equipamento' }, { id: 'eq-winaudit', label: '4.5 Importação WinAudit (Windows)' }, { id: 'eq-chromebook', label: '4.6 Importação Chromebook (CSV Google Admin)' }] },
    { id: 'tela-movimentacoes', label: '5. Tela: Movimentações', sub: [{ id: 'mv-grupos', label: '5.1 Grupos e tipos' }, { id: 'mv-entrada', label: '5.2 Entrada' }, { id: 'mv-saida', label: '5.3 Saída' }, { id: 'mv-transferencia', label: '5.4 Transferência' }, { id: 'mv-manutencao', label: '5.5 Manutenção: Envio / Retorno / Formatação' }, { id: 'mv-estorno', label: '5.6 Estorno de movimentação' }] },
    { id: 'tela-centro-midia', label: '6. Tela: Centro de Mídia' },
    { id: 'tela-escolas', label: '7. Tela: Escolas' },
    { id: 'tela-auditoria', label: '8. Tela: Auditoria' },
    { id: 'tela-relatorios', label: '9. Relatórios', sub: [{ id: 'rel-equip', label: '9.1 Relatório de Equipamentos (lista)' }, { id: 'rel-equip-sing', label: '9.2 Relatório singular de equipamento' }, { id: 'rel-mov', label: '9.3 Relatório de Movimentações' }, { id: 'rel-impressao', label: '9.4 Impressão em PDF / impressora (40 linhas por página)' }] },
    { id: 'tela-usuarios', label: '10. Tela: Usuários' },
    { id: 'tela-config', label: '11. Tela: Configurações (Admin/Gestor)', sub: [{ id: 'cfg-seguranca', label: '11.1 Segurança (Doado)' }, { id: 'cfg-permissoes', label: '11.2 Permissões (botão Editar)' }, { id: 'cfg-func', label: '11.3 Funcionalidades (Chromebook CSV)' }, { id: 'cfg-validade', label: '11.4 Validade do equipamento' }, { id: 'cfg-api', label: '11.5 API base URL e token' }] },
    { id: 'faq', label: '13. FAQ e resolução de problemas' },
    { id: 'suporte', label: '14. Suporte' },
  ]
  return (
    <>
      <Secao id="indice">Índice</Secao>
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
      <Secao id="visao-geral">1. Visão Geral</Secao>
      <SubSecao id="oq-sistema">1.1 O que faz o sistema</SubSecao>
      <Paragrafo>O <strong>Sistema de Inventário ASRS</strong> controla todo o ciclo de vida de equipamentos (notebooks, computadores, chromebooks, projetores) nas escolas e setores administrativos:</Paragrafo>
      <ListaComMarcadores>
        <ItemLista>Cadastro completo de equipamento com Patrimônio, Número de Série, Modelo, Localização, Usuário e Situação.</ItemLista>
        <ItemLista>Controle de movimentações: Entrada, Saída, Transferência, Manutenção (Envio/Retorno) e <strong>Formatação</strong> (altera nome do equipamento).</ItemLista>
        <ItemLista>Importações automatizadas via <em>WinAudit</em> (Windows XML) e <em>Chromebook CSV Google Admin</em>.</ItemLista>
        <ItemLista>Relatórios de equipamentos e movimentações com impressão multi-páginas (40 linhas/página).</ItemLista>
        <ItemLista>Auditoria de ações e trilha de alterações dos equipamentos.</ItemLista>
      </ListaComMarcadores>
      <SubSecao id="telas">1.2 Navegação e telas</SubSecao>
      <TabelaPermissoes linhas={[
        { tela: 'Início · /equipamentos', desc: 'Tela principal: lista de equipamentos', admin: '✅', gestor: '✅', tecnico: '✅', usuario: '✅' },
        { tela: 'Movimentações · /movimentacoes', desc: 'Nova movimentação e listagem', admin: '✅', gestor: '✅', tecnico: '✅', usuario: '✅' },
        { tela: 'Centro de Mídia · /centro-midia', desc: 'Controle do departamento de mídia', admin: '✅', gestor: '✅', tecnico: '✅', usuario: '✅' },
        { tela: 'Escolas · /escolas', desc: 'Cadastro/edição de escolas', admin: '✅', gestor: '✅', tecnico: '✅', usuario: '✅' },
        { tela: 'Auditoria · /auditoria', desc: 'Trilha de logs e históricos', admin: '✅', gestor: '✅', tecnico: '✅', usuario: '✅' },
        { tela: 'Relatórios (submenu)', desc: 'Equipamentos / Movimentações', admin: '✅', gestor: '✅', tecnico: '✅', usuario: '✅' },
        { tela: 'Usuários · /usuarios', desc: 'Cadastro de usuários do sistema', admin: '✅', gestor: '✅', tecnico: '❌', usuario: '❌' },
        { tela: 'Configurações · /config', desc: 'Switches e chaves globais', admin: '✅', gestor: '✅', tecnico: '❌', usuario: '❌' },
      ]} />
      <SubSecao id="fluxo">1.3 Fluxo típico de operação</SubSecao>
      <ListaNumerada>
        <ItemLista>Cadastrar a escola (se for nova) em <strong>Escolas</strong>.</ItemLista>
        <ItemLista>Cadastrar equipamento em <strong>Equipamentos</strong> (ou importar em lote).</ItemLista>
        <ItemLista>Usar <strong>Movimentações · Entrada</strong> para registrar o recebimento de equipamentos novos ou formatados.</ItemLista>
        <ItemLista>Usar <strong>Transferência</strong> quando o equipamento mudar de escola / usuário.</ItemLista>
        <ItemLista>Usar <strong>Manutenção · Formatação</strong> antes de reatribuir o equipamento.</ItemLista>
        <ItemLista>Gerar <strong>Relatórios</strong> e exportar em PDF.</ItemLista>
      </ListaNumerada>
    </>
  )
}

function Autenticacao() {
  return (
    <>
      <Secao id="autenticacao">2. Autenticação</Secao>
      <SubSecao id="login">2.1 Login</SubSecao>
      <ListaNumerada>
        <ItemLista>Acesse a página <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm">/login</code>.</ItemLista>
        <ItemLista>Informe e-mail corporativo e senha.</ItemLista>
        <ItemLista>Clique em <strong>Entrar</strong>. O token Bearer é salvo automaticamente e expira conforme política da instituição.</ItemLista>
      </ListaNumerada>
      <SubSecao id="esqueci">2.2 Esqueci / resetar senha</SubSecao>
      <ListaComMarcadores>
        <ItemLista>Em <code>/forgot-password</code>, informe o e-mail cadastrado → link de recuperação é enviado.</ItemLista>
        <ItemLista>Abra o link, crie uma nova senha (mínimo 6 caracteres, confirmação) em <code>/reset-password</code>.</ItemLista>
      </ListaComMarcadores>
      <Paragrafo><Etiqueta cor="yellow"><AlertTriangle className="h-3 w-3 mr-1 inline" />Aviso</Etiqueta>&nbsp; Caso o link não chegue em até 5 minutos, verifique a caixa de spam ou contate seu gestor.</Paragrafo>
    </>
  )
}

function Permissoes() {
  return (
    <>
      <Secao id="permissoes">3. Perfis e permissões</Secao>
      <SubSecao id="roles">3.1 4 perfis de acesso</SubSecao>
      <ListaComMarcadores>
        <ItemLista><Etiqueta cor="red">ADMIN</Etiqueta>&nbsp; Super usuário: acesso total (todas as telas, todas as ações, inclusive Usuários e Configurações).</ItemLista>
        <ItemLista><Etiqueta cor="blue">GESTOR</Etiqueta>&nbsp; Gerencia a instituição: cadastra edita exclui equipamentos/escolas; aprova movimentações; configura chaves globais (exceto criar outro ADMIN).</ItemLista>
        <ItemLista><Etiqueta cor="yellow">TÉCNICO</Etiqueta>&nbsp; Executa operações de campo: cadastra, edita, faz manutenção/formatação, gera relatórios. Não exclui.</ItemLista>
        <ItemLista><Etiqueta cor="gray">USUÁRIO</Etiqueta>&nbsp; Apenas visualiza equipamentos e relatórios (leitura).</ItemLista>
      </ListaComMarcadores>
      <SubSecao id="matriz">3.2 Matriz de permissões</SubSecao>
      <TabelaPermissoes linhas={[
        { tela: 'Criar equipamento', desc: 'Incluir novo registro', admin: '✅', gestor: '✅', tecnico: '✅', usuario: '❌' },
        { tela: 'Editar equipamento', desc: 'Editar campos existentes (switch em Config, padrão OFF)', admin: '✅', gestor: '✅¹', tecnico: '✅¹', usuario: '❌' },
        { tela: 'Excluir equipamento', desc: 'Remover registro', admin: '✅', gestor: '✅', tecnico: '❌', usuario: '❌' },
        { tela: 'Editar/excluir DOADO', desc: 'Bloqueio global padrão ON', admin: '✅', gestor: '✅²', tecnico: '❌²', usuario: '❌' },
        { tela: 'Criar movimentação', desc: 'Entrada / Saída / Transferência / Manutenção', admin: '✅', gestor: '✅', tecnico: '✅', usuario: '❌' },
        { tela: 'Estornar movimentação', desc: 'Desfazer e marcar', admin: '✅', gestor: '✅', tecnico: '❌', usuario: '❌' },
        { tela: 'Relatórios e impressão', desc: 'Gerar e imprimir relatórios', admin: '✅', gestor: '✅', tecnico: '✅', usuario: '✅' },
        { tela: 'Tela Usuários', desc: 'Cadastrar usuários', admin: '✅', gestor: '✅', tecnico: '❌', usuario: '❌' },
        { tela: 'Tela Configurações', desc: 'Ajustar chaves globais', admin: '✅', gestor: '✅', tecnico: '❌', usuario: '❌' },
      ]} />
      <Paragrafo className="text-sm italic">
        ¹ Switch <strong>Permissões · Habilitar botão Editar</strong> na tela Configurações — padrão <strong>DESLIGADO</strong>. Ao desligado, botões Editar em Equipamentos ficam ocultos. ² Chave <strong>Segurança · Bloquear Editar/Excluir Doado</strong> — padrão <strong>LIGADO</strong>.
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
        <ItemLista>Clique no botão azul <strong>“+ Novo Equipamento”</strong> no topo.</ItemLista>
        <ItemLista>Preencha os campos obrigatórios: Nome, Tipo, Escola, Modelo, Número de Série, Localização, Usuário, Aquisição, Situação.</ItemLista>
        <ItemLista>Campo <em>Patrimônio</em> opcional (usado para ativos etiquetados).</ItemLista>
        <ItemLista>Clique em <strong>Salvar</strong>. Toast verde confirma.</ItemLista>
      </ListaNumerada>
      <SubSecao id="eq-editar">4.2 Editar / excluir / marcar DOADO</SubSecao>
      <Paragrafo>Cada linha na tabela possui 3 ações à direita:</Paragrafo>
      <ListaComMarcadores>
        <ItemLista>✏️ <strong>Editar</strong> — abre o formulário. <em>Observação: o botão só aparece se o switch em Configurações &gt; Permissões estiver LIGADO (padrão desligado).</em></ItemLista>
        <ItemLista>🗑️ <strong>Excluir</strong> — remove o registro (confirmação em 2 passos).</ItemLista>
        <ItemLista>🖨️ <strong>Relatório singular</strong> — abre a ficha completa daquele equipamento.</ItemLista>
      </ListaComMarcadores>
      <Paragrafo><Etiqueta cor="yellow">Segurança Doado</Etiqueta>&nbsp; Equipamentos marcados com Situação = <strong>DOADO</strong> tem Editar e Excluir bloqueados por padrão (ver 11.1).</Paragrafo>
      <SubSecao id="eq-filtros">4.3 Filtros e busca</SubSecao>
      <ListaComMarcadores>
        <ItemLista>Departamento: Equipamentos / Centro de Mídia.</ItemLista>
        <ItemLista>Status: DISPONÍVEL, EM_USO, RESERVADO, EM_MANUTENÇÃO, DOADO, DESCARTE, FORMATADO.</ItemLista>
        <ItemLista>Tipo: NOTEBOOK, COMPUTADOR, CHROMEBOOK, PROJETOR, IMPRESSORA, OUTRO.</ItemLista>
        <ItemLista>Escola: dropdown por escola cadastrada.</ItemLista>
        <ItemLista>Busca por texto: nome, patrimônio, serial, usuário.</ItemLista>
      </ListaComMarcadores>
      <SubSecao id="eq-status">4.4 Status do equipamento</SubSecao>
      <ListaComMarcadores>
        <ItemLista><Etiqueta cor="green">DISPONÍVEL</Etiqueta> — pronto para uso, sem responsável.</ItemLista>
        <ItemLista><Etiqueta cor="blue">EM_USO</Etiqueta> — atribuído a um usuário / localização.</ItemLista>
        <ItemLista><Etiqueta cor="yellow">RESERVADO</Etiqueta> — aguardando uso.</ItemLista>
        <ItemLista><Etiqueta cor="gray">EM_MANUTENÇÃO</Etiqueta> — fora do ar / laboratório.</ItemLista>
        <ItemLista><Etiqueta cor="red">DESCARTADO</Etiqueta> — inutilizado, fim de vida.</ItemLista>
        <ItemLista><Etiqueta cor="red">DOADO</Etiqueta> — doado; bloqueio de editar/excluir padrão.</ItemLista>
        <ItemLista><Etiqueta cor="gray">🖥️ FORMATADO</Etiqueta> — recém-formatado, pronto para nova atribuição.</ItemLista>
      </ListaComMarcadores>
      <SubSecao id="eq-winaudit">4.5 Importação WinAudit (Windows)</SubSecao>
      <ListaNumerada>
        <ItemLista>Selecione um relatório HTML (.html ou .htm) gerado pelo WinAudit. Se o equipamento já estiver cadastrado, revise os valores atuais e importados, escolha os campos que deseja atualizar e confirme pelo toast padrão do sistema.</ItemLista>
        <ItemLista>Para equipamentos já cadastrados, compare valores atuais e importados, selecione os campos a atualizar e confirme pelo toast padrão do sistema.</ItemLista>
        <ItemLista>Campos vazios não apagam dados. Patrimônio, escola, status e localização administrativa permanecem intactos. Sem diferenças, não há atualização nem duplicação.</ItemLista>
      </ListaNumerada>
      <SubSecao id="eq-chromebook">4.6 Importação Chromebook (CSV Google Admin)</SubSecao>
      <Paragrafo>Esta funcionalidade depende do switch em <strong>Configurações &gt; Funcionalidades &gt; Chromebook CSV</strong> (padrão LIGADO). Se desligado, backend retorna <em>403 Forbidden</em>.</Paragrafo>
      <ListaNumerada>
        <ItemLista>No Google Admin Console: Dispositivos &gt; Chrome &gt; Dispositivos &gt; Exportar CSV.</ItemLista>
        <ItemLista>No Sistema Inventário, clique em <strong>“Importar Chromebook CSV”</strong>.</ItemLista>
        <ItemLista>As colunas padrão são detectadas automaticamente: deviceId, serialNumber, model, status, annotatedUser, annotatedLocation, annotatedAssetId, lastSync, osVersion.</ItemLista>
        <ItemLista>Antes de confirmar, tabela de pré-visualização mostra: ✅ criação, ✏️ atualização, ⚠️ conflito (resolva manualmente).</ItemLista>
        <ItemLista>Clique em Confirmar. Chromebooks aparecem com tipo <em>CHROMEBOOK</em>.</ItemLista>
      </ListaNumerada>
    </>
  )
}

function TelaMovimentacoes() {
  return (
    <>
      <Secao id="tela-movimentacoes">5. Tela: Movimentações</Secao>
      <Paragrafo>Histórico e criação de movimentações. Atalho <ArrowRightLeft className="h-3 w-3 inline mx-1" /> <em>Movimentações</em>.</Paragrafo>
      <SubSecao id="mv-grupos">5.1 Grupos e tipos de movimentação</SubSecao>
      <ListaComMarcadores>
        <ItemLista><strong>Entrada / Saída / Transferência</strong> (grupo Movimentação geral).</ItemLista>
        <ItemLista><strong>Manutenção:</strong> Envio para manutenção, Retorno da manutenção, Formatação (novo na versão 1.2.7).</ItemLista>
      </ListaComMarcadores>
      <SubSecao id="mv-entrada">5.2 Movimentação · ENTRADA</SubSecao>
      <Paragrafo>Equipamentos elegíveis: status <Etiqueta cor="blue">EM_USO</Etiqueta> ou <Etiqueta cor="gray">FORMATADO</Etiqueta>.</Paragrafo>
      <ListaNumerada>
        <ItemLista>Selecione tipo Entrada.</ItemLista>
        <ItemLista>Equipamento: busque por nome / patrimônio / serial.</ItemLista>
        <ItemLista>Preencha Destino (escola), Usuário responsável, Observações.</ItemLista>
        <ItemLista>Salvar: equipamento volta para <Etiqueta cor="blue">EM_USO</Etiqueta>.</ItemLista>
      </ListaNumerada>
      <SubSecao id="mv-saida">5.3 SAÍDA</SubSecao>
      <Paragrafo>Elegibilidade: <Etiqueta cor="blue">EM_USO</Etiqueta>.</Paragrafo>
      <SubSecao id="mv-transferencia">5.4 TRANSFERÊNCIA</SubSecao>
      <Paragrafo>Muda escola/local/usuário sem retirar do status EM_USO. Origem e Destino editáveis.</Paragrafo>
      <SubSecao id="mv-manutencao">5.5 Manutenção: Envio · Retorno · Formatação</SubSecao>
      <ListaNumerada>
        <ItemLista><strong>Envio Manutenção</strong>: equipamento vai para <Etiqueta cor="gray">EM_MANUTENÇÃO</Etiqueta>. Campos: Origem, Técnico responsável, Observações defeito.</ItemLista>
        <ItemLista><strong>Retorno Manutenção</strong>: tira de <Etiqueta cor="gray">EM_MANUTENÇÃO</Etiqueta>; volta para status anterior ou novo destino.</ItemLista>
        <ItemLista><strong>Formatação 🆕 (v1.2.7)</strong>: usado quando HD é limpo e SO reinstalado. <em>O equipamento pode receber um novo NOME</em>. Campos obrigatórios:
          <ListaComMarcadores>
            <ItemLista>Nome atual (somente leitura, auto-preenchido).</ItemLista>
            <ItemLista>Nome após formatação (obrigatório, com asterisco).</ItemLista>
            <ItemLista>Observações: imagem drivers instalados, serial Windows, partição EFI, softwares de produtividade instalados etc.</ItemLista>
          </ListaComMarcadores>
          Resultado: equipamento fica com novo nome e status <Etiqueta cor="gray">🖥️ FORMATADO</Etiqueta>, pronto para nova atribuição (Entrada).
        </ItemLista>
      </ListaNumerada>
      <SubSecao id="mv-estorno">5.6 Estorno de movimentação</SubSecao>
      <Paragrafo>Apenas Admin/Gestor. Ao clicar em “Estornar” na linha da movimentação: é pedido motivo e o status do equipamento volta ao estado anterior.</Paragrafo>
    </>
  )
}

function TelaCentroMidia() {
  return (
    <>
      <Secao id="tela-centro-midia">6. Tela: Centro de Mídia</Secao>
      <Paragrafo>Departamento específico para projetores, telas, sistemas de som, equipamentos de empréstimo. Filtro equivalente a <em>Departamento: Centro de Mídia</em>. Todos os comandos de Equipamentos valem aqui.</Paragrafo>
    </>
  )
}

function TelaEscolas() {
  return (
    <>
      <Secao id="tela-escolas">7. Tela: Escolas</Secao>
      <ListaNumerada>
        <ItemLista>Botão <strong>“+ Nova Escola”</strong> cadastra: Nome, Código INEP, Município, Endereço, Telefone, Diretor(a).</ItemLista>
        <ItemLista>Lista é buscável por nome / município.</ItemLista>
        <ItemLista>Escola usada em equipamento/movimentação não pode ser excluída sem desvincular antes.</ItemLista>
      </ListaNumerada>
    </>
  )
}

function TelaAuditoria() {
  return (
    <>
      <Secao id="tela-auditoria">8. Tela: Auditoria</Secao>
      <Paragrafo>Trilha de alterações dos equipamentos, com: data/hora, usuário autor, ação (criar/editar/excluir), campo alterado, valor antigo, valor novo.</Paragrafo>
      <ListaComMarcadores>
        <ItemLista>Filtros: período, equipamento, usuário, tipo ação.</ItemLista>
        <ItemLista>Exportação CSV (mesmo padrão dos demais relatórios).</ItemLista>
        <ItemLista>Auditoria é <strong>imutável</strong>: nenhum usuário (mesmo Admin) consegue apagar um registro.</ItemLista>
      </ListaComMarcadores>
    </>
  )
}

function TelaRelatorios() {
  return (
    <>
      <Secao id="tela-relatorios">9. Relatórios</Secao>
      <SubSecao id="rel-equip">9.1 Relatório de Equipamentos (lista)</SubSecao>
      <Paragrafo>Caminho: menu <FileText className="inline h-3 w-3 mx-1" /> Relatórios &gt; Equipamentos.</Paragrafo>
      <ListaNumerada>
        <ItemLista>Ajuste filtros (Departamento, Status, Tipo, Escola, busca por texto).</ItemLista>
        <ItemLista>Botão <strong>Imprimir / PDF</strong> abre overlay com pré-visualização.</ItemLista>
        <ItemLista>Diálogo do navegador abre automaticamente; escolha impressora ou “Salvar como PDF”.</ItemLista>
      </ListaNumerada>
      <SubSecao id="rel-equip-sing">9.2 Relatório singular de equipamento</SubSecao>
      <Paragrafo>Ação da linha em Equipamentos 🖨️ — ficha individual com foto/dados básicos e histórico de movimentações daquele equipamento.</Paragrafo>
      <SubSecao id="rel-mov">9.3 Relatório de Movimentações</SubSecao>
      <Paragrafo>Filtros por período, escola, tipo de movimento, usuário, patrimônio, série, estornadas.</Paragrafo>
      <SubSecao id="rel-impressao">9.4 Regras de impressão (40 linhas por página)</SubSecao>
      <ListaComMarcadores>
        <ItemLista>Automaticamente quebra em blocos de <strong>40 equipamentos / movimentações por folha A4 paisagem</strong>.</ItemLista>
        <ItemLista>Todas as páginas repetem: logo ASRS, título, filtros aplicados, rodapé.</ItemLista>
        <ItemLista>Rodapé mostra <em>Página X de Y</em> e <em>Total da página N | Geral: Y</em>.</ItemLista>
        <ItemLista>Cabeçalho da tabela (thead) e rodapé (tfoot) são repetidos também pelo próprio motor de impressão.</ItemLista>
        <ItemLista>Cor / fundo das linhas zebradas e cabeçalho escuro são preservados (print-color-adjust: exact).</ItemLista>
      </ListaComMarcadores>
      <Paragrafo><Etiqueta cor="green"><CheckCircle2 className="h-3 w-3 mr-1 inline" />Dica</Etiqueta>&nbsp; Para economizar tinta, desmarque a opção “Cabeçalhos e rodapés” nas configurações avançadas de impressão do navegador (os cabeçalhos do relatório já são embutidos no HTML).</Paragrafo>
    </>
  )
}

function TelaUsuarios() {
  return (
    <>
      <Secao id="tela-usuarios">10. Tela: Usuários (Admin / Gestor)</Secao>
      <ListaNumerada>
        <ItemLista>Botão <strong>“+ Novo Usuário”</strong>: Nome, E-mail, Senha inicial, Perfil (Usuário / Técnico / Gestor / Admin).</ItemLista>
        <ItemLista>Editar: altere nome / perfil / reset de senha.</ItemLista>
        <ItemLista>Excluir: usuário é desativado (auditoria mantém os logs).</ItemLista>
      </ListaNumerada>
      <Paragrafo><Etiqueta cor="red">Aviso segurança</Etiqueta>&nbsp; Não crie perfis de Admin para usuários de campo. Prefira Gestor ou Técnico.</Paragrafo>
    </>
  )
}

function TelaConfig() {
  return (
    <>
      <Secao id="tela-config">11. Tela: Configurações (Admin / Gestor)</Secao>
      <Paragrafo>Atalho <Settings2 className="h-3 w-3 inline mx-1" /> Config. Alterações são salvas no <em>localStorage</em> do navegador, com chaves espelhadas no backend onde se aplica.</Paragrafo>
      <SubSecao id="cfg-seguranca">11.1 Segurança</SubSecao>
      <ListaComMarcadores>
        <ItemLista><strong>Bloquear Editar / Excluir (equipamentos Doado)</strong> — padrão <Etiqueta cor="green">LIGADO</Etiqueta>. Evita alteração/acidente em bens doados.</ItemLista>
      </ListaComMarcadores>
      <SubSecao id="cfg-permissoes">11.2 Permissões</SubSecao>
      <ListaComMarcadores>
        <ItemLista><strong>Habilitar botão Editar em Equipamentos</strong> — padrão <Etiqueta cor="red">DESLIGADO</Etiqueta> (v1.2.7). Desligado: Técnicos e Gestores criam e movimentam mas não editaram campos de equipamentos já cadastrados. <em>A tela Movimentações mantém o botão Editar independentemente.</em></ItemLista>
      </ListaComMarcadores>
      <SubSecao id="cfg-func">11.3 Funcionalidades</SubSecao>
      <ListaComMarcadores>
        <ItemLista><strong>Habilitar importação Chromebook CSV</strong> — padrão <Etiqueta cor="green">LIGADO</Etiqueta>. Desligar remove os botões no frontend e valida no backend (403).</ItemLista>
      </ListaComMarcadores>
      <SubSecao id="cfg-validade">11.4 Validade do equipamento</SubSecao>
      <ListaComMarcadores>
        <ItemLista><strong>Anos de vida útil</strong> padrão 5 anos. Usado para cálculo de equipamentos próximos ao fim de vida.</ItemLista>
      </ListaComMarcadores>
      <SubSecao id="cfg-api">11.5 API base URL e token Bearer</SubSecao>
      <ListaComMarcadores>
        <ItemLista>Campos de configuração de endpoint e token (permite trocar entre produção e homolog localmente). Sempre que alterar, clique em Salvar e recarregue a página.</ItemLista>
      </ListaComMarcadores>
    </>
  )
}


function SecaoFAQ() {
  const perguntas = [
    { q: '“Botões Editar não aparecem na tela Equipamentos.”', r: 'Verifique Configurações → Permissões → Habilitar botão Editar. Por segurança está DESLIGADO de fábrica na 1.2.7.' },
    { q: '“Preview mostra 2 páginas, mas impressora só imprime a primeira.”', r: 'Use o disparo automático do botão Imprimir/PDF (iframe.contentWindow.print()). Não pressione Ctrl+P manualmente no overlay React — isso imprimiria o documento pai.' },
    { q: '“Não consigo editar/excluir um equipamento DOADO.”', r: 'Chave Segurança Bloquear Doado está LIGADA por padrão. Desative temporariamente em Configurações, faça a alteração, depois religue.' },
    { q: '“Importação Chromebook retorna 403 Forbidden.”', r: 'Switch Chromebook CSV em Configurações está DESLIGADO. Ligue e recarregue a página.' },
    { q: '“Popup bloqueado ao imprimir.”', r: 'Atualização 1.2.7 não usa popup para impressão. Apenas overlay iframe. Se aparecer popup bloqueado, libere popups para o site na barra de endereço do Chrome.' },
    { q: '“Tentativa de movimentação FORMATACAO retorna erro 400.”', r: 'Campo “nomeFormatado” é obrigatório e “nomeAtual” não pode ser editado. Campos extras proibidos (400 FORMATACAO_CAMPOS_EXTRA).' },
  ]
  return (
    <>
      <Secao id="faq">13. FAQ e resolução de problemas</Secao>
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
      <Paragrafo>Para dúvidas, erros ou novas solicitações:</Paragrafo>
      <ListaComMarcadores>
        <ItemLista>Equipe ASRS: suporte interno.</ItemLista>
        <ItemLista>Repositório: <code className="rounded bg-gray-100 px-1.5 py-0.5">github.com/MSJantana/inventario</code></ItemLista>
        <ItemLista>Reportar bugs: anexar print do erro, nome do usuário, tela, horário e qual navegador/versão.</ItemLista>
      </ListaComMarcadores>
      <Paragrafo className="text-sm italic text-gray-500 border-t pt-4">Fim do manual. Documento revisado para a versão {APP_VERSION}.</Paragrafo>
    </>
  )
}

const secoes: Secao[] = [
  { id: 'capa', titulo: 'Capa', render: () => <Painel className="!p-0 !border-none !shadow-none"><Capa /></Painel> },
  { id: 'indice', titulo: 'Índice', render: () => <Painel><Indice /></Painel> },
  { id: 'visao-geral', titulo: 'Visão Geral', render: () => <Painel><VisaoGeral /></Painel> },
  { id: 'autenticacao', titulo: 'Autenticação', render: () => <Painel><Autenticacao /></Painel> },
  { id: 'permissoes', titulo: 'Permissões', render: () => <Painel><Permissoes /></Painel> },
  { id: 'eq', titulo: 'Equipamentos', render: () => <Painel><TelaEquipamentos /></Painel> },
  { id: 'mv', titulo: 'Movimentações', render: () => <Painel><TelaMovimentacoes /></Painel> },
  { id: 'cm', titulo: 'Centro de Mídia', render: () => <Painel><TelaCentroMidia /></Painel> },
  { id: 'escolas', titulo: 'Escolas', render: () => <Painel><TelaEscolas /></Painel> },
  { id: 'aud', titulo: 'Auditoria', render: () => <Painel><TelaAuditoria /></Painel> },
  { id: 'rels', titulo: 'Relatórios', render: () => <Painel><TelaRelatorios /></Painel> },
  { id: 'users', titulo: 'Usuários', render: () => <Painel><TelaUsuarios /></Painel> },
  { id: 'cfg', titulo: 'Configurações', render: () => <Painel><TelaConfig /></Painel> },
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
<title>Manual do Sistema - Versão ${escapeHtml(APP_VERSION)}</title>
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

    const tituloManual = 'Manual do Sistema de Inventário ASRS'
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
      <p style="color:#475569;">Controle Inteligente de Estoque · ASRS</p>
      <div style="border:1px solid #cbd5e1;background:#f8fafc;padding:10px 14px;display:inline-block;margin-top:10px;text-align:left;font-size:12px;">
        <p><strong>Versão:</strong> ${escapeHtml(APP_VERSION)}</p>
        <p><strong>Gerado em:</strong> ${escapeHtml(hoje)}</p>
        <p><strong>Público-alvo:</strong> Administradores, Gestores, Técnicos e Usuários finais.</p>
      </div>
    </div>`,
      '<div style="page-break-after: always;"></div>',
      partesConteudo.join('\n'),
      `<div style="border-top:1px solid #cbd5e1;margin-top:24px;padding-top:4px;font-size:9.5px;color:#64748b;text-align:right;">Manual do Sistema de Inventário ASRS · v${escapeHtml(APP_VERSION)}</div>`,
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
              <p className="truncate text-xs text-gray-500">v{APP_VERSION} · {hoje}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIdxAberto((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 sm:hidden"
              aria-expanded={idxAberto}
            >
              Índice
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
