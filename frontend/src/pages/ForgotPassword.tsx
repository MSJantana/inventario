import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/axios';
import { showSuccessToast, showErrorToast, showWarningToast } from '../utils/toast';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!email.trim()) {
      showWarningToast('Informe seu email');
      setLoading(false);
      return;
    }

    try {
      await api.post('/api/usuarios/recuperar-senha', { email });
      showSuccessToast('Instruções enviadas para o seu email!');
      navigate('/login');
    } catch (err: unknown) {
      showErrorToast(
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Erro ao solicitar recuperação'
          : 'Erro ao solicitar recuperação'
      );
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
          <h2 className="mb-4 text-center text-base font-semibold tracking-wide">ESQUECI MINHA SENHA</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs">Email</label>
              <div className="flex items-center gap-2">
                <span className="text-black">▸</span>
                <input
                  type="email"
                  className="w-full border-b border-black bg-transparent px-2 py-2 focus:outline-none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black px-4 py-2 text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? 'Enviando...' : 'Enviar Instruções'}
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
            <h2 className="mb-2 text-center text-base font-semibold">Esqueci Minha Senha</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium">E-mail</label>
                <input
                  type="email"
                  className="w-full rounded-lg border px-3 py-2"
                  placeholder="Hello@dream.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-black px-4 py-2 text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {loading ? 'Enviando...' : 'Enviar Instruções'}
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