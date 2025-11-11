import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../lib/axios';
import { showSuccessToast, showErrorToast, showWarningToast } from '../utils/toast';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false);

  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setToken(urlToken);
    } else {
      showWarningToast('Token de redefinição não encontrado na URL');
      navigate('/login');
    }
  }, [searchParams, navigate]);

  const validarSenha = (senha: string) => {
    const minLength = 8;
    const hasUpper = /[A-Z]/.test(senha);
    const hasLower = /[a-z]/.test(senha);
    const hasNumber = /\d/.test(senha);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(senha);
    
    if (senha.length < minLength) return 'Senha deve ter pelo menos 8 caracteres';
    if (!hasUpper) return 'Senha deve conter pelo menos uma letra maiúscula';
    if (!hasLower) return 'Senha deve conter pelo menos uma letra minúscula';
    if (!hasNumber) return 'Senha deve conter pelo menos um número';
    if (!hasSpecial) return 'Senha deve conter pelo menos um caractere especial';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (novaSenha !== confirmarSenha) {
      showWarningToast('As senhas não coincidem');
      setLoading(false);
      return;
    }

    const erroSenha = validarSenha(novaSenha);
    if (erroSenha) {
      showWarningToast(erroSenha);
      setLoading(false);
      return;
    }

    try {
      await api.post('/api/usuarios/redefinir-senha', { token, novaSenha });
      showSuccessToast('Senha redefinida com sucesso! Faça login com a nova senha.');
      navigate('/login');
    } catch (err: unknown) {
      if (err instanceof Error) {
        showErrorToast((err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Erro ao redefinir senha');
      } else {
        showErrorToast('Erro ao redefinir senha');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Fundo com curva preta (igual ao Login) */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full hidden md:block" viewBox="0 0 1440 1024" preserveAspectRatio="none" aria-hidden>
        <path d="M0 0 H900 C850 180 760 300 560 430 C360 560 300 750 240 1024 H0 Z" fill="#000" />
      </svg>

      {/* Conteúdo Desktop/Tablet (mais compacto) */}
      <div className="relative z-10 hidden md:flex min-h-screen items-start justify-end">
        <div className="w-full max-w-md px-6 py-8">
          <h2 className="mb-4 text-center text-base font-semibold tracking-wide">REDEFINIR SENHA</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs">Nova Senha</label>
              <div className="flex items-center gap-2">
                <span className="text-black">▸</span>
                <input
                  type={showNovaSenha ? 'text' : 'password'}
                  className="w-full border-b border-black bg-transparent px-2 py-2 focus:outline-none"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowNovaSenha(!showNovaSenha)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 transform text-gray-500"
                >
                  {showNovaSenha ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs">Confirmar Nova Senha</label>
              <div className="flex items-center gap-2">
                <span className="text-black">▸</span>
                <input
                  type={showConfirmarSenha ? 'text' : 'password'}
                  className="w-full border-b border-black bg-transparent px-2 py-2 focus:outline-none"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmarSenha(!showConfirmarSenha)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 transform text-gray-500"
                >
                  {showConfirmarSenha ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black px-4 py-2 text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? 'Enviando...' : 'Redefinir Senha'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full block border border-black px-4 py-2 text-black transition hover:bg-black hover:text-white text-center"
            >
              Cancelar
            </button>
          </form>
        </div>
      </div>

      {/* Mobile (card mais compacto, sem scroll) */}
      <div className="relative z-10 md:hidden flex min-h-screen items-start justify-center pt-8">
        <div className="w-[340px] rounded-3xl bg-white shadow-2xl ring-1 ring-gray-200 overflow-hidden">
          <div className="relative bg-black h-24">
            <div className="absolute inset-0 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            {/* Curva inferior branca reduzida */}
            <svg className="absolute bottom-0 left-0 h-8 w-full" viewBox="0 0 320 48" preserveAspectRatio="none" aria-hidden>
              <path d="M0 48 C60 16 160 0 320 0 L320 48 Z" fill="#fff" />
            </svg>
          </div>
          <div className="px-5 py-4">
            <h2 className="mb-2 text-center text-base font-semibold">Redefinir Senha</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium">Nova Senha</label>
                <input
                  type={showNovaSenha ? 'text' : 'password'}
                  className="w-full rounded-lg border px-3 py-2"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowNovaSenha(!showNovaSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transform text-gray-500"
                >
                  {showNovaSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Confirmar Nova Senha</label>
                <input
                  type={showConfirmarSenha ? 'text' : 'password'}
                  className="w-full rounded-lg border px-3 py-2"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmarSenha(!showConfirmarSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transform text-gray-500"
                >
                  {showConfirmarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-black px-4 py-2 text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {loading ? 'Enviando...' : 'Redefinir Senha'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full rounded-full bg-gray-300 px-4 py-2 text-black transition hover:opacity-90"
              >
                Cancelar
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}