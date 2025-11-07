import { useEffect, useState, useRef } from 'react'
import { NavLink, Route, Routes, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { Monitor, Shuffle, School, Settings, LogIn, Menu, FileText, User, LogOut, ChevronDown } from 'lucide-react'
import './index.css'
import EquipamentosPage from './pages/Equipamentos'
import MovimentacoesPage from './pages/Movimentacoes'
import EscolasPage from './pages/Escolas'
import ConfigPage from './pages/Config'
import LoginPage from './pages/Login'
import RelatoriosEquipamentosPage from './pages/RelatoriosEquipamentos'
import UsuariosPage from './pages/Usuarios'
import { useAppStore } from './store/useAppStore'

// PrivateRoute component
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const authToken = useAppStore((s) => s.authToken)
  return authToken ? <>{children}</> : <Navigate to="/login" replace />
}

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const authToken = useAppStore((s) => s.authToken)
  const setAuthTokenState = useAppStore((s) => s.setAuthTokenState)
  const isLoginRoute = location.pathname === '/login'
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const userName = localStorage.getItem('userName') || ''
  const userEmail = localStorage.getItem('userEmail') || ''
  useEffect(() => { /* rolagem ao topo em troca de rota */ window.scrollTo({ top: 0 }) }, [location.pathname])

  // Fechar menu ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  useEffect(() => { setMobileOpen(false) }, [location.pathname])
  const routeLabels: Record<string, string> = {
    '/': 'Dashboard',
    '/equipamentos': 'Gestão de Equipamentos',
    '/movimentacoes': 'Movimentações',
    '/escolas': 'Escolas',
    '/config': 'Configuração',
    '/relatorios': 'Relatórios',
    '/usuarios': 'Gestão de Usuários',
  }

  return (
    <div className="min-h-screen flex flex-col">
      {!isLoginRoute && (
        <>
          {/* Top Navigation Bar */}
          <header className="bg-black text-white px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <h1 className="text-xl font-semibold">Inventário</h1>
                <nav className="hidden md:flex items-center gap-4">
                  <NavLink to="/equipamentos" className={({isActive}) => `flex items-center gap-2 rounded px-3 py-2 ${isActive ? 'bg-white text-black' : 'text-gray-200 hover:text-white hover:bg-white/10'}`}>
                    <Monitor className="h-4 w-4" strokeWidth={1.75} />
                    <span>Equipamentos</span>
                  </NavLink>
                  <NavLink to="/movimentacoes" className={({isActive}) => `flex items-center gap-2 rounded px-3 py-2 ${isActive ? 'bg-white text-black' : 'text-gray-200 hover:text-white hover:bg-white/10'}`}>
                    <Shuffle className="h-4 w-4" strokeWidth={1.75} />
                    <span>Movimentações</span>
                  </NavLink>
                  <NavLink to="/escolas" className={({isActive}) => `flex items-center gap-2 rounded px-3 py-2 ${isActive ? 'bg-white text-black' : 'text-gray-200 hover:text-white hover:bg-white/10'}`}>
                    <School className="h-4 w-4" strokeWidth={1.75} />
                    <span>Escolas</span>
                  </NavLink>
                  <NavLink to="/relatorios" className={({isActive}) => `flex items-center gap-2 rounded px-3 py-2 ${isActive ? 'bg-white text-black' : 'text-gray-200 hover:text-white hover:bg-white/10'}`}>
                    <FileText className="h-4 w-4" strokeWidth={1.75} />
                    <span>Relatórios</span>
                  </NavLink>
                  <NavLink to="/usuarios" className={({isActive}) => `flex items-center gap-2 rounded px-3 py-2 ${isActive ? 'bg-white text-black' : 'text-gray-200 hover:text-white hover:bg-white/10'}`}>
                    <User className="h-4 w-4" strokeWidth={1.75} />
                    <span>Usuários</span>
                  </NavLink>
                </nav>
              </div>
              <div className="flex items-center gap-4">
                {/* Menu Suspenso do Usuário - Estilo Gmail */}
                {authToken && (
                  <div className="relative" ref={userMenuRef}>
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center space-x-2 rounded px-3 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-white/10"
                    >
                      <div className="bg-gray-700 rounded-full p-1.5">
                        <User className="h-4 w-4 text-gray-300" strokeWidth={1.75} />
                      </div>
                      <span>{userName || 'Usuário'}</span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} strokeWidth={1.75} />
                    </button>

                    {/* Menu Suspenso */}
                    {userMenuOpen && (
                      <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                        <div className="py-1">
                          {/* Cabeçalho do menu com informações do usuário */}
                          <div className="px-4 py-3 border-b border-gray-100">
                            <p className="text-sm font-medium text-gray-900">{userName || 'Usuário'}</p>
                            <p className="text-xs text-gray-500">{userEmail || 'email@exemplo.com'}</p>
                          </div>

                          {/* Opções do menu */}
                          <NavLink
                            to="/config"
                            className={({ isActive }) =>
                              `flex items-center space-x-3 px-4 py-2 text-sm transition-colors ${
                                isActive
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'text-gray-700 hover:bg-gray-100'
                              }`
                            }
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <Settings className="h-4 w-4" strokeWidth={1.75} />
                            <span>Configurações</span>
                          </NavLink>

                          <button
                            onClick={() => {
                              localStorage.removeItem('authToken')
                              localStorage.removeItem('userName')
                              localStorage.removeItem('userEmail')
                              setAuthTokenState('')
                              navigate('/login')
                              setUserMenuOpen(false)
                            }}
                            className="flex w-full items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <LogOut className="h-4 w-4" strokeWidth={1.75} />
                            <span>Sair</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Mobile menu toggle */}
                <button className="md:hidden rounded border px-2 py-2" onClick={() => setMobileOpen(true)} aria-label="Abrir menu">
                  <Menu className="h-5 w-5" />
                </button>
              </div>
            </div>
          </header>

          {/* Sidebar mobile (overlay) */}
          {mobileOpen && (
            <div className="md:hidden">
              <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)} />
              <aside className="fixed left-0 top-0 bottom-0 z-50 w-64 bg-black text-white">
                <div className="flex items-center justify-between px-4 py-4 text-sm font-semibold">
                  <span>Inventário</span>
                  <button className="rounded bg-white/10 px-2 py-1" onClick={() => setMobileOpen(false)}>Fechar</button>
                </div>
                <nav className="space-y-1 px-2">
                  <NavLink to="/equipamentos" className={({isActive}) => `flex items-center gap-2 rounded px-3 py-2 ${isActive ? 'bg-white text-black' : 'text-gray-200 hover:text-white hover:bg-white/10'}`}>
                    <Monitor className="h-4 w-4" strokeWidth={1.75} />
                    <span>Equipamentos</span>
                  </NavLink>
                  <NavLink to="/movimentacoes" className={({isActive}) => `flex items-center gap-2 rounded px-3 py-2 ${isActive ? 'bg-white text-black' : 'text-gray-200 hover:text-white hover:bg-white/10'}`}>
                    <Shuffle className="h-4 w-4" strokeWidth={1.75} />
                    <span>Movimentações</span>
                  </NavLink>
                  <NavLink to="/escolas" className={({isActive}) => `flex items-center gap-2 rounded px-3 py-2 ${isActive ? 'bg-white text-black' : 'text-gray-200 hover:text-white hover:bg-white/10'}`}>
                    <School className="h-4 w-4" strokeWidth={1.75} />
                    <span>Escolas</span>
                  </NavLink>
                  <NavLink to="/relatorios" className={({isActive}) => `flex items-center gap-2 rounded px-3 py-2 ${isActive ? 'bg-white text-black' : 'text-gray-200 hover:text-white hover:bg-white/10'}`}>
                    <FileText className="h-4 w-4" strokeWidth={1.75} />
                    <span>Relatórios</span>
                  </NavLink>
                  <NavLink to="/config" className={({isActive}) => `flex items-center gap-2 rounded px-3 py-2 ${isActive ? 'bg-white text-black' : 'text-gray-200 hover:text-white hover:bg-white/10'}`}>
                    <Settings className="h-4 w-4" strokeWidth={1.75} />
                    <span>Config</span>
                  </NavLink>
                  <NavLink to="/usuarios" className={({isActive}) => `flex items-center gap-2 rounded px-3 py-2 ${isActive ? 'bg-white text-black' : 'text-gray-200 hover:text-white hover:bg-white/10'}`}>
                    <User className="h-4 w-4" strokeWidth={1.75} />
                    <span>Usuários</span>
                  </NavLink>
                </nav>
                <div className="px-2 pb-4 pt-2">
                  {authToken ? (
                    <button
                      className="w-full flex items-center gap-2 rounded bg-white px-3 py-2 text-black hover:opacity-90 text-sm"
                      onClick={() => { localStorage.removeItem('authToken'); localStorage.removeItem('userName'); localStorage.removeItem('userEmail'); setAuthTokenState(''); navigate('/login') }}
                    >
                      <LogOut className="h-4 w-4" strokeWidth={1.75} />
                      <span>Sair</span>
                    </button>
                  ) : (
                    <NavLink to="/login" className={({isActive}) => `flex items-center gap-2 rounded px-3 py-2 text-sm ${isActive ? 'bg-white text-black' : 'text-gray-200 hover:text-white hover:bg-white/10'}`}>
                      <LogIn className="h-4 w-4" strokeWidth={1.75} />
                      <span>Login</span>
                    </NavLink>
                  )}
                </div>
              </aside>
            </div>
          )}

          {/* Main Content */}
          <main className="flex-1 p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">{userName ? `Bem-vindo, ${userName}` : 'Bem-vindo'}</h2>
              <p className="text-xs text-gray-500">{routeLabels[location.pathname] || 'Página'}</p>
            </div>
            <div className="space-y-6">
              <Routes>
                <Route path="/" element={<PrivateRoute><EquipamentosPage /></PrivateRoute>} />
                <Route path="/equipamentos" element={<PrivateRoute><EquipamentosPage /></PrivateRoute>} />
                <Route path="/movimentacoes" element={<PrivateRoute><MovimentacoesPage /></PrivateRoute>} />
                <Route path="/escolas" element={<PrivateRoute><EscolasPage /></PrivateRoute>} />
                <Route path="/relatorios" element={<PrivateRoute><RelatoriosEquipamentosPage /></PrivateRoute>} />
                <Route path="/usuarios" element={<PrivateRoute><UsuariosPage /></PrivateRoute>} />
                <Route path="/config" element={<PrivateRoute><ConfigPage /></PrivateRoute>} />
                <Route path="/login" element={<LoginPage />} />
              </Routes>
            </div>
          </main>
        </>
      )}

      {/* Login Route - Full Screen */}
      {isLoginRoute && (
        <div className="flex-1">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </div>
      )}
    </div>
  )
}

export default App
