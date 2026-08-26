import { useEffect, useMemo, useRef, useState } from 'react'
import { Pencil, Trash2, Save, RotateCcw, Plus, Eye, EyeOff, Building2 } from 'lucide-react'
import api from '../lib/axios'
import { showSuccessToast, showErrorToast, showWarningToast, showConfirmToast } from '../utils/toast'

type UsuarioEscolaAcesso = {
  escolaId: string
  escola?: { nome: string }
}

type Usuario = {
  id: string
  nome: string
  email: string
  role: 'ADMIN' | 'GESTOR' | 'TECNICO' | 'USUARIO'
  cargo?: string
  escolaId?: string
  escola?: { nome: string }
  escolasAcesso?: UsuarioEscolaAcesso[]
  createdAt: string
  updatedAt: string
}

type Escola = {
  id: string
  nome: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/

const ROLE_LABELS: Readonly<Record<Usuario['role'], string>> = {
  ADMIN: 'Administrador',
  GESTOR: 'Gestor',
  TECNICO: 'Técnico',
  USUARIO: 'Usuário',
} as const

function isEmailValido(input: string): boolean {
  if (!input) return false
  const trimmed = input.trim()
  if (!trimmed) return false
  if (trimmed.length > 254) return false
  if (trimmed.includes('..')) return false
  const atIndex = trimmed.lastIndexOf('@')
  if (atIndex <= 0 || atIndex === trimmed.length - 1) return false
  return EMAIL_REGEX.test(trimmed)
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Estados para formulário de criação
  const [showCreate, setShowCreate] = useState(false)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'ADMIN' | 'GESTOR' | 'TECNICO' | 'USUARIO'>('USUARIO');
  const [cargo, setCargo] = useState('')
  const [escolaId, setEscolaId] = useState('')
  const [schoolAccessUser, setSchoolAccessUser] = useState<Usuario | null>(null)
  const [managedSchoolIds, setManagedSchoolIds] = useState<string[]>([])
  const [savingSchoolAccess, setSavingSchoolAccess] = useState(false)
  const nomeInputRef = useRef<HTMLInputElement | null>(null)
  const dialogEscolasRef = useRef<HTMLDialogElement | null>(null)
  const escolasTriggerRef = useRef<HTMLButtonElement | null>(null)

  // Estados para formulário de edição
  const [editingId, setEditingId] = useState<string | null>(null)

  // Carregar dados iniciais
  useEffect(() => {
    carregarDados()
  }, [])

  useEffect(() => {
    if (showCreate) {
      setTimeout(() => nomeInputRef.current?.focus(), 0)
    }
  }, [showCreate])

  useEffect(() => {
    if (!schoolAccessUser) return
    const dialog = dialogEscolasRef.current
    if (!dialog) return
    window.requestAnimationFrame(() => {
      dialog.showModal()
      const closeBtn = dialog.querySelector<HTMLButtonElement>('[data-escolas-close="1"]')
        ?? dialog.querySelector<HTMLButtonElement>('button')
      closeBtn?.focus()
    })
    return () => {
      if (dialog.open) dialog.close()
    }
  }, [schoolAccessUser])

  async function carregarDados() {
    setLoading(true)
    setError(null)
    try {
      const [respUsuarios, respEscolas] = await Promise.all([
        api.get('/api/usuarios'),
        api.get('/api/escolas')
      ])
      setUsuarios(respUsuarios.data || [])
      setEscolas(respEscolas.data || [])
    } catch (e: unknown) {
      setError((e as Error)?.message || 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    
    // Validações comuns
    if (!nome.trim() || !email.trim()) {
      showWarningToast('Preencha nome e email')
      return
    }

    // Validação de email
    if (!isEmailValido(email)) {
      showWarningToast('Email inválido')
      return
    }

    // Se for criação, senha é obrigatória
    if (!editingId && !senha.trim()) {
      showWarningToast('Preencha a senha')
      return
    }

    // Se for criação ou edição com senha preenchida, validar tamanho
    if (senha && senha.length < 6) {
      showWarningToast('Senha deve ter no mínimo 6 caracteres')
      return
    }

    try {
      let resp: { data: Usuario }
      
      if (editingId) {
        // Modo edição
        const payload = {
          nome: nome.trim(),
          email: email.trim(),
          role,
          cargo: cargo.trim() || undefined,
          escolaId: escolaId || undefined,
          ...(senha && { senha }) // Só inclui senha se foi preenchida
        }
        
        resp = await api.put(`/api/usuarios/${editingId}`, payload)
        showSuccessToast('Usuário atualizado com sucesso!')
        
        // Atualizar usuário na lista
        setUsuarios(prev => prev.map(u => u.id === editingId ? resp.data : u))
        
      } else {
        // Modo criação
        const payload = {
          nome: nome.trim(),
          email: email.trim(),
          senha,
          role,
          cargo: cargo.trim() || undefined,
          escolaId: escolaId || undefined
        }
        
        resp = await api.post('/api/usuarios', payload)
        showSuccessToast('Usuário criado com sucesso!')
        
        // Adicionar usuário na lista
        setUsuarios(prev => [resp.data, ...prev])
      }
      
      // Limpar formulário e fechar
      setNome('')
      setEmail('')
      setSenha('')
      setRole('USUARIO')
      setCargo('')
      setEscolaId('')
      setEditingId(null)
      setShowCreate(false)
      
    } catch (e: unknown) {
      const errorMsg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      showErrorToast(errorMsg || 'Erro ao salvar usuário')
    }
  }



  async function confirmarExclusaoUsuario(id: string) {
    try {
      await api.delete(`/api/usuarios/${id}`)
      showSuccessToast('Usuário excluído com sucesso!')
      setUsuarios((prev) => prev.filter((u) => u.id !== id))
    } catch (e: unknown) {
      const errorMsg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      showErrorToast(errorMsg || 'Erro ao excluir usuário')
    }
  }

  function excluirUsuario(id: string) {
    showConfirmToast('Tem certeza que deseja excluir este usuário?', () => {
      void confirmarExclusaoUsuario(id)
    })
  }

  function iniciarEdicao(usuario: Usuario) {
    // Abrir o formulário de criação com os dados do usuário para edição
    setShowCreate(true)
    setNome(usuario.nome)
    setEmail(usuario.email)
    setSenha('') // Senha não é preenchida por segurança
    setRole(usuario.role)
    setCargo(usuario.cargo || '')
    setEscolaId(usuario.escolaId || '')
    setEditingId(usuario.id) // Guardar o ID para saber que é edição
  }

  function getAdditionalSchools(usuario: Usuario): UsuarioEscolaAcesso[] {
    const escolaPrincipalId = usuario.escolaId
    return (usuario.escolasAcesso || []).filter((item) => item.escolaId !== escolaPrincipalId)
  }

  function abrirGestaoEscolas(usuario: Usuario, triggerBtn?: HTMLButtonElement | null) {
    if (triggerBtn) escolasTriggerRef.current = triggerBtn
    setSchoolAccessUser(usuario)
    setManagedSchoolIds(getAdditionalSchools(usuario).map((item) => item.escolaId))
  }

  function fecharGestaoEscolas() {
    if (dialogEscolasRef.current?.open) {
      dialogEscolasRef.current.close()
    }
    const prev = escolasTriggerRef.current
    setSchoolAccessUser(null)
    setManagedSchoolIds([])
    setTimeout(() => prev?.focus(), 0)
  }

  const managedSchoolIdsSet = useMemo(() => new Set(managedSchoolIds), [managedSchoolIds])

  function alternarEscolaGerenciada(id: string) {
    setManagedSchoolIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  async function salvarEscolasGerenciadas() {
    if (!schoolAccessUser) return

    setSavingSchoolAccess(true)
    try {
      const resp = await api.put(`/api/usuarios/${schoolAccessUser.id}/escolas`, {
        escolaIds: managedSchoolIds,
      })
      showSuccessToast('Escolas adicionais atualizadas com sucesso!')
      setUsuarios((prev) => prev.map((u) => (u.id === schoolAccessUser.id ? resp.data : u)))
      fecharGestaoEscolas()
    } catch (e: unknown) {
      const errorMsg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      showErrorToast(errorMsg || 'Erro ao atualizar escolas do usuário')
    } finally {
      setSavingSchoolAccess(false)
    }
  }

  function cancelarCriacao() {
    setShowCreate(false)
    setNome('')
    setEmail('')
    setSenha('')
    setRole('USUARIO')
    setCargo('')
    setEscolaId('')
    setEditingId(null) // Limpar ID de edição ao cancelar
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Usuários</h1>
        {!showCreate ? (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={16} aria-hidden />
            <span>Adicionar Usuário</span>
          </button>
        ) : null}
      </div>

      {error && (
        <div className="rounded bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}

      {/* Formulário de Criação/Edição */}
      {showCreate && (
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-medium">
            {editingId ? 'Editar Usuário' : 'Adicionar Novo Usuário'}
          </h2>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor="nome" className="mb-1 block text-sm font-medium">Nome *</label>
              <input
                id="nome"
                type="text"
                className="w-full rounded border px-3 py-2"
                ref={nomeInputRef}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium">Email *</label>
              <input
                id="email"
                type="email"
                className="w-full rounded border px-3 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="senhaUsuario" className="mb-1 block text-sm font-medium">
                Senha {editingId ? '(opcional - deixe vazio para manter atual)' : '*'}
              </label>
              <div className="relative">
                <input
                  id="senhaUsuario"
                  type={showPassword ? 'text' : 'password'}
                  className="w-full rounded border px-3 py-2 pr-10"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required={!editingId}
                  minLength={6}
                  placeholder={editingId ? '•••••••• (digite apenas se quiser alterar)' : 'Mínimo 6 caracteres'}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  aria-pressed={showPassword}
                  aria-controls="senhaUsuario"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={20} aria-hidden /> : <Eye size={20} aria-hidden />}
                </button>
              </div>
              {editingId && (
                <p className="mt-1 text-xs text-gray-500">
                  Para manter a senha atual, deixe este campo vazio
                </p>
              )}
            </div>
            <div>
              <label htmlFor="role" className="mb-1 block text-sm font-medium">Função</label>
              <select
                id="role"
                className="w-full rounded border px-3 py-2"
                value={role}
                onChange={(e) => setRole(e.target.value as 'ADMIN' | 'GESTOR' | 'TECNICO' | 'USUARIO')}
              >
                <option value="USUARIO">Usuário</option>
                <option value="TECNICO">Técnico</option>
                <option value="GESTOR">Gestor</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
            <div>
              <label htmlFor="cargo" className="mb-1 block text-sm font-medium">Cargo</label>
              <input
                id="cargo"
                type="text"
                className="w-full rounded border px-3 py-2"
                value={cargo}
                onChange={(e) => setCargo(e.target.value.toUpperCase())}
                placeholder="Ex: Técnico, Professor, Coordenador..."
              />
            </div>
            <div>
              <label htmlFor="escolaId" className="mb-1 block text-sm font-medium">Escola</label>
              <select
                id="escolaId"
                className="w-full rounded border px-3 py-2"
                value={escolaId}
                onChange={(e) => setEscolaId(e.target.value)}
              >
                <option value="">Selecione uma escola</option>
                {escolas.map((escola) => (
                  <option key={escola.id} value={escola.id}>
                    {escola.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
              <button
                type="submit"
                className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 flex items-center gap-2"
              >
                <Save size={16} aria-hidden />
                <span>Salvar</span>
              </button>
              <button
                type="button"
                onClick={carregarDados}
                className="rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700 flex items-center gap-2"
              >
                <RotateCcw size={16} aria-hidden />
                <span>Recarregar</span>
              </button>
              <button
                type="button"
                onClick={cancelarCriacao}
                className="rounded border px-4 py-2 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Usuários */}
      <div className="rounded-lg border bg-white shadow-sm">
        {/* Tabela para desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Função
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Cargo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Escola
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Criado em
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {usuarios.map((usuario) => {
                const qtdEscolasAdicionais = getAdditionalSchools(usuario).length
                return (
                <tr key={usuario.id}>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {usuario.nome}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm text-gray-900">{usuario.email}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                      usuario.role === 'ADMIN' || usuario.role === 'GESTOR'
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {ROLE_LABELS[usuario.role]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {usuario.cargo || '-'}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {usuario.escola?.nome || '-'}
                      {qtdEscolasAdicionais > 0 && (
                        <div className="text-xs text-blue-700">
                          +{qtdEscolasAdicionais} escola(s) adicional(is)
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {new Date(usuario.createdAt).toLocaleDateString('pt-BR')}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      {usuario.role !== 'ADMIN' && (
                        <button
                          type="button"
                          onClick={(e) => abrirGestaoEscolas(usuario, e.currentTarget)}
                          aria-label={`Gerenciar escolas adicionais do usuário ${usuario.nome}`}
                          className="rounded bg-indigo-600 px-2 py-1 text-white hover:bg-indigo-700 flex items-center gap-1"
                        >
                          <Building2 size={16} aria-hidden />
                          <span>Escolas</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => iniciarEdicao(usuario)}
                        aria-label={`Editar dados do usuário ${usuario.nome}`}
                        className="rounded bg-blue-600 px-2 py-1 text-white hover:bg-blue-700 flex items-center gap-1"
                      >
                        <Pencil size={16} aria-hidden />
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => excluirUsuario(usuario.id)}
                        aria-label={`Excluir o usuário ${usuario.nome}`}
                        className="rounded bg-red-600 px-2 py-1 text-white hover:bg-red-700 flex items-center gap-1"
                      >
                        <Trash2 size={16} aria-hidden />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </td>
                </tr>
                )
              })}
              {usuarios.length === 0 && (
                <tr>
                  <td className="px-6 py-4 text-center text-gray-500" colSpan={7}>
                    {loading ? 'Carregando...' : 'Nenhum usuário encontrado'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Cards para mobile */}
        <div className="md:hidden divide-y divide-gray-200">
          {usuarios.map((usuario) => {
            const qtdEscolasAdicionais = getAdditionalSchools(usuario).length
            return (
            <div key={usuario.id} className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900">{usuario.nome}</h3>
                  <p className="text-xs text-gray-500">{usuario.email}</p>
                </div>
                <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                  usuario.role === 'ADMIN' || usuario.role === 'GESTOR'
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {ROLE_LABELS[usuario.role]}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
                <div>
                  <span className="font-medium">Cargo:</span>
                  <p>{usuario.cargo || '-'}</p>
                </div>
                <div>
                  <span className="font-medium">Escola:</span>
                  <p>{usuario.escola?.nome || '-'}</p>
                  {qtdEscolasAdicionais > 0 && (
                    <p className="text-blue-700">+{qtdEscolasAdicionais} adicional(is)</p>
                  )}
                </div>
                <div className="col-span-2">
                  <span className="font-medium">Criado em:</span>
                  <p>{new Date(usuario.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                {usuario.role !== 'ADMIN' && (
                  <button
                    type="button"
                    onClick={(e) => abrirGestaoEscolas(usuario, e.currentTarget)}
                    aria-label={`Gerenciar escolas adicionais do usuário ${usuario.nome}`}
                    className="flex-1 bg-indigo-600 text-white px-3 py-2 rounded-md text-xs font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center justify-center gap-1"
                  >
                    <Building2 size={14} aria-hidden />
                    <span>Escolas</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => iniciarEdicao(usuario)}
                  aria-label={`Editar dados do usuário ${usuario.nome}`}
                  className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md text-xs font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center gap-1"
                >
                  <Pencil size={14} aria-hidden />
                  <span>Editar</span>
                </button>
                <button
                  type="button"
                  onClick={() => excluirUsuario(usuario.id)}
                  aria-label={`Excluir o usuário ${usuario.nome}`}
                  className="flex-1 bg-red-600 text-white px-3 py-2 rounded-md text-xs font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center justify-center gap-1"
                >
                  <Trash2 size={14} aria-hidden />
                  <span>Excluir</span>
                </button>
              </div>
            </div>
            )
          })}
          {usuarios.length === 0 && (
            <div className="p-4 text-center text-sm text-gray-600">
              {loading ? 'Carregando...' : 'Nenhum usuário encontrado'}
            </div>
          )}
        </div>
      </div>

      {schoolAccessUser && (
        <dialog
          ref={dialogEscolasRef}
          aria-labelledby="escolas-dialog-title"
          onCancel={fecharGestaoEscolas}
          onClose={fecharGestaoEscolas}
          className="m-0 border-0 p-0 bg-transparent max-w-none max-h-none w-screen h-screen fixed inset-0 z-50 backdrop:bg-black/40"
        >
          <div className="relative w-full h-full flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Fechar gestão de escolas adicionais"
              onClick={fecharGestaoEscolas}
              tabIndex={-1}
              className="absolute inset-0 m-0 border-0 p-0 bg-transparent cursor-default"
            />
            <div
              className="relative z-10 w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl mx-4"
            >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="escolas-dialog-title" className="text-lg font-semibold">Escolas adicionais do usuário</h2>
                <p className="text-sm text-gray-600">{schoolAccessUser.nome}</p>
                <p className="text-sm text-gray-500">
                  Escola principal: {schoolAccessUser.escola?.nome || 'Não definida'}
                </p>
              </div>
              <button
                type="button"
                data-escolas-close="1"
                aria-label="Fechar gestão de escolas adicionais"
                onClick={fecharGestaoEscolas}
                className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 rounded border bg-gray-50 p-3 text-sm text-gray-700">
              Selecione as escolas adicionais que esse usuário também pode administrar.
            </div>

            <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
              {(() => {
                const escolasDisponiveisGestao = escolas.filter((escola) => escola.id !== schoolAccessUser.escolaId)
                return escolasDisponiveisGestao.length === 0 ? (
                  <div className="rounded border border-dashed p-4 text-sm text-gray-500">
                    Nenhuma outra escola disponível para vincular.
                  </div>
                ) : (
                  escolasDisponiveisGestao.map((escola) => (
                    <label
                      key={escola.id}
                      className="flex items-center gap-3 rounded border px-3 py-2 hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={managedSchoolIdsSet.has(escola.id)}
                        onChange={() => alternarEscolaGerenciada(escola.id)}
                      />
                      <span className="text-sm text-gray-900">{escola.nome}</span>
                    </label>
                  ))
                )
              })()}
            </div>

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={salvarEscolasGerenciadas}
                disabled={savingSchoolAccess}
                className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {savingSchoolAccess ? 'Salvando...' : 'Salvar escolas'}
              </button>
              <button
                type="button"
                onClick={fecharGestaoEscolas}
                className="rounded border px-4 py-2 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
          </div>
        </dialog>
      )}
    </div>
  )
}
