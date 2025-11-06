import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/axios'
import toast from 'react-hot-toast'
import { setAuthToken } from '../services/auth'
import { useAppStore } from '../store/useAppStore'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const setAuthTokenState = useAppStore((s) => s.setAuthTokenState)

  const onLogin = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!email.trim() || !senha.trim()) {
      toast.error('Informe email e senha')
      return
    }
    setLoading(true)
    try {
      const resp = await api.post('/api/usuarios/login', { email, senha })
      const token = resp.data?.token
      if (!token) throw new Error('Token não recebido')
      setAuthToken(token)
      setAuthTokenState(token)
      // Guardar nome do usuário para saudação
      const nome = resp.data?.usuario?.nome || ''
      if (nome) {
        localStorage.setItem('userName', nome)
      }
      toast.success('Login realizado')
      navigate('/equipamentos')
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { error?: string } } }).response?.data?.error ||
        (e as Error).message ||
        'Falha no login'
      )
    } finally {
      setLoading(false)
    }
  }

  const onForgot = async () => {
    if (!email.trim()) {
      toast.error('Informe seu email para recuperar a senha')
      return
    }
    try {
      await api.post('/api/usuarios/recuperar-senha', { email })
      toast.success('Instruções enviadas para o seu email')
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { error?: string } } }).response?.data?.error ||
        'Erro ao enviar instruções'
      )
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Fundo com curva preta */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1440 1024" preserveAspectRatio="none" aria-hidden>
        <path d="M0 0 H900 C850 180 760 300 560 430 C360 560 300 750 240 1024 H0 Z" fill="#000" />
      </svg>

      {/* Conteúdo */}
      <div className="relative z-10 flex min-h-screen items-center justify-end">
        <div className="w-full max-w-md px-8 py-10">
          <h2 className="mb-6 text-center text-lg font-semibold tracking-wide">SIGN IN</h2>
          <form onSubmit={onLogin} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm">Email</label>
              <div className="flex items-center gap-2">
                <span className="text-black">▸</span>
                <input
                  type="email"
                  className="w-full border-b border-black bg-transparent px-2 py-2 focus:outline-none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm">Senha</label>
              <div className="flex items-center gap-2">
                <span className="text-black">▸</span>
                <input
                  type="password"
                  className="w-full border-b border-black bg-transparent px-2 py-2 focus:outline-none"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
              </div>
            </div>
            {/* Removido texto REGISTER */}

            <div className="space-y-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-black px-4 py-2 text-white transition hover:opacity-90 disabled:opacity-60"
              >
                LOGIN
              </button>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="flex-1 border-t" />
                <span>OR</span>
                <span className="flex-1 border-t" />
              </div>
              <button
                type="button"
                className="w-full border border-black px-4 py-2 text-black transition hover:bg-black hover:text-white"
                onClick={onForgot}
              >
                Forgot password?
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}