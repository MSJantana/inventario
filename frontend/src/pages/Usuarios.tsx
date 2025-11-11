import { useEffect, useState } from 'react'
import { Pencil, Trash2, Save, RotateCcw, X, Plus } from 'lucide-react'
import api from '../lib/axios'
import { showSuccessToast, showErrorToast, showWarningToast } from '../utils/toast'

type Usuario = {
  id: string
  nome: string
  email: string
  role: 'ADMIN' | 'GESTOR' | 'TECNICO' | 'USUARIO'
  cargo?: string
  escolaId?: string
  escola?: { nome: string }
  createdAt: string
  updatedAt: string
}

type Escola = {
  id: string
  nome: string
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
  const [role, setRole] = useState<'ADMIN' | 'USER'>('USER')
  const [cargo, setCargo] = useState('')
  const [escolaId, setEscolaId] = useState('')

  // Estados para formulário de edição
  const [editingId, setEditingId] = useState<string | null>(null)

  // Carregar dados iniciais
  useEffect(() => {
    carregarDados()
  }, [])

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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
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
      setRole('USER')
      setCargo('')
      setEscolaId('')
      setEditingId(null)
      setShowCreate(false)
      
    } catch (e: unknown) {
      const errorMsg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      showErrorToast(errorMsg || 'Erro ao salvar usuário')
    }
  }



  async function excluirUsuario(id: string) {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return
    
    try {
      await api.delete(`/api/usuarios/${id}`)
      showSuccessToast('Usuário excluído com sucesso!')
      setUsuarios(prev => prev.filter(u => u.id !== id))
    } catch {
      showErrorToast('Erro ao excluir usuário')
    }
  }

  function iniciarEdicao(usuario: Usuario) {
    // Abrir o formulário de criação com os dados do usuário para edição
    setShowCreate(true)
    setNome(usuario.nome)
    setEmail(usuario.email)
    setSenha('') // Senha não é preenchida por segurança
    setRole(usuario.role === 'ADMIN' ? 'ADMIN' : 'USER')
    setCargo(usuario.cargo || '')
    setEscolaId(usuario.escolaId || '')
    setEditingId(usuario.id) // Guardar o ID para saber que é edição
  }



  function cancelarCriacao() {
    setShowCreate(false)
    setNome('')
    setEmail('')
    setSenha('')
    setRole('USER')
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
            onClick={() => setShowCreate(true)}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={16} />
            <span>Adicionar Usuário</span>
          </button>
        ) : (
          <button
            onClick={() => setShowCreate(false)}
            className="rounded border px-4 py-2 hover:bg-gray-50 flex items-center gap-2"
          >
            <X size={16} />
            <span>Fechar</span>
          </button>
        )}
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
              <label className="mb-1 block text-sm font-medium">Nome *</label>
              <input
                type="text"
                className="w-full rounded border px-3 py-2"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Email *</label>
              <input
                type="email"
                className="w-full rounded border px-3 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Senha {editingId ? '(opcional - deixe vazio para manter atual)' : '*'}
              </label>
              <input
                type="password"
                className="w-full rounded border px-3 py-2"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required={!editingId}
                minLength={6}
                placeholder={editingId ? '•••••••• (digite apenas se quiser alterar)' : 'Mínimo 6 caracteres'}
                autoComplete="new-password"
              />
              {editingId && (
                <p className="mt-1 text-xs text-gray-500">
                  Para manter a senha atual, deixe este campo vazio
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Função</label>
              <select
                className="w-full rounded border px-3 py-2"
                value={role}
                onChange={(e) => setRole(e.target.value as 'ADMIN' | 'USER')}
              >
                <option value="USUARIO">Usuário</option>
                <option value="TECNICO">Técnico</option>
                <option value="GESTOR">Gestor</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Cargo</label>
              <input
                type="text"
                className="w-full rounded border px-3 py-2"
                value={cargo}
                onChange={(e) => setCargo(e.target.value.toUpperCase())}
                placeholder="Ex: Técnico, Professor, Coordenador..."
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Escola</label>
              <select
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
                <Save size={16} />
                <span>Salvar</span>
              </button>
              <button
                type="button"
                onClick={carregarDados}
                className="rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700 flex items-center gap-2"
              >
                <RotateCcw size={16} />
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
              {usuarios.map((usuario) => (
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
                      {usuario.role === 'ADMIN' ? 'Administrador' : 
                       usuario.role === 'GESTOR' ? 'Gestor' :
                       usuario.role === 'TECNICO' ? 'Técnico' :
                       'Usuário'}
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
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {new Date(usuario.createdAt).toLocaleDateString('pt-BR')}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => iniciarEdicao(usuario)}
                        className="rounded bg-blue-600 px-2 py-1 text-white hover:bg-blue-700 flex items-center gap-1"
                      >
                        <Pencil size={16} />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => excluirUsuario(usuario.id)}
                        className="rounded bg-red-600 px-2 py-1 text-white hover:bg-red-700 flex items-center gap-1"
                      >
                        <Trash2 size={16} />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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
          {usuarios.map((usuario) => (
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
                  {usuario.role === 'ADMIN' ? 'Administrador' : 
                   usuario.role === 'GESTOR' ? 'Gestor' :
                   usuario.role === 'TECNICO' ? 'Técnico' :
                   'Usuário'}
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
                </div>
                <div className="col-span-2">
                  <span className="font-medium">Criado em:</span>
                  <p>{new Date(usuario.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => iniciarEdicao(usuario)}
                  className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md text-xs font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center gap-1"
                >
                  <Pencil size={14} />
                  <span>Editar</span>
                </button>
                <button
                  onClick={() => excluirUsuario(usuario.id)}
                  className="flex-1 bg-red-600 text-white px-3 py-2 rounded-md text-xs font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center justify-center gap-1"
                >
                  <Trash2 size={14} />
                  <span>Excluir</span>
                </button>
              </div>
            </div>
          ))}
          {usuarios.length === 0 && (
            <div className="p-4 text-center text-sm text-gray-600">
              {loading ? 'Carregando...' : 'Nenhum usuário encontrado'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}