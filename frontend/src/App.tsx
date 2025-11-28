import { useEffect, useState, useRef } from 'react';
import type { ComponentType } from 'react';
import { NavLink, Route, Routes, useLocation, useNavigate, Navigate, Outlet } from 'react-router-dom';
import { Monitor, Shuffle, School, Settings, LogIn, Menu, FileText, User, LogOut, ChevronDown, Image, AlertCircle, Building2 } from 'lucide-react';
import './index.css';
import EquipamentosPage from './pages/Equipamentos';
import MovimentacoesPage from './pages/Movimentacoes';
import EscolasPage from './pages/Escolas';
import ConfigPage from './pages/Config';
import LoginPage from './pages/Login';
import RelatoriosEquipamentosPage from './pages/RelatoriosEquipamentos';
import UsuariosPage from './pages/Usuarios';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import { useAppStore } from './store/useAppStore';
import CentroMidiaPage from './pages/CentroMidia';
import api from './lib/axios';
const APP_VERSION = (import.meta.env.VITE_APP_VERSION as string) || '1.1.1';

// ---------- Helpers ----------
const navItems = [
  { to: '/movimentacoes', label: 'Movimentações', Icon: Shuffle },
  { to: '/escolas', label: 'Escolas', Icon: School },
  { to: '/relatorios', label: 'Relatórios', Icon: FileText },
  { to: '/usuarios', label: 'Usuários', Icon: User },
];

const deptItems = [
  { to: '/equipamentos', label: 'Equipamentos', Icon: Monitor },
  { to: '/centro-midia', label: 'Centro de Midia', Icon: Image },
];

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 rounded px-3 py-2 ${isActive ? 'bg-white text-black' : 'text-gray-200 hover:text-white hover:bg-white/10'}`;

// Tipos de Role (frontend)
type Role = 'ADMIN' | 'GESTOR' | 'TECNICO' | 'USUARIO';
const getUserRole = (): Role => (localStorage.getItem('userRole') as Role) || 'USUARIO';
const canAccessPath = (role: Role, path: string) => {
  if (path === '/centro-midia') return role === 'ADMIN';
  if (role === 'ADMIN' || role === 'GESTOR') return true;
  return path !== '/config' && path !== '/usuarios';
};

// ---------- Guards / Layouts ----------
function RequireAuth() {
  const authToken = useAppStore((s) => s.authToken);
  return authToken ? <Outlet /> : <Navigate to="/login" replace />;
}

function RoleGuard({ allowed, children }: { allowed: Role[]; children: React.ReactElement }) {
  const role = getUserRole();
  return allowed.includes(role) ? children : <Navigate to="/equipamentos" replace />;
}

function AuthLayout() {
   // Layout limpo apenas com as rotas de autenticação
   return (
     <div className="flex-1">
       <Routes>
         <Route path="/login" element={<LoginPage />} />
         <Route path="/forgot-password" element={<ForgotPassword />} />
         <Route path="/reset-password" element={<ResetPassword />} />
       </Routes>
     </div>
   );
 }

// ---------- UI Reutilizável ----------
function NavLinks() {
  const role = getUserRole();
  const items = navItems.filter(({ to }) => canAccessPath(role, to));
  const deptChildren = deptItems.filter(({ to }) => canAccessPath(role, to));
  return (
    <>
      {deptChildren.length > 0 && (
        <NavDropdown label="Departamentos" Icon={Building2} items={deptChildren} />
      )}
      {items.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} className={navClass}>
          <Icon className="h-4 w-4" strokeWidth={1.75} />
          <span>{label}</span>
        </NavLink>
      ))}
    </>
  );
}

function UserDropdown({
  userName,
  userEmail,
  onLogout,
  hasWhatsNew,
  onOpenWhatsNew,
}: {
  userName: string;
  userEmail: string;
  onLogout: () => void;
  hasWhatsNew: boolean;
  onOpenWhatsNew: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const role = getUserRole();

  useEffect(() => {
    const handler = (ev: MouseEvent) => {
      if (ref.current && !ref.current.contains(ev.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center space-x-2 rounded px-3 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg.white/10 hover:bg-white/10"
      >
        <div className="relative rounded-full p-1.5 bg-gray-700">
          <User className="h-4 w-4 text-gray-300" strokeWidth={1.75} />
          {hasWhatsNew ? (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-600 ring-2 ring-black" />
          ) : null}
        </div>
        <span>{userName || 'Usuário'}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} strokeWidth={1.75} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900">{userName || 'Usuário'}</p>
              <p className="text-xs text-gray-500">{userEmail || 'email@exemplo.com'}</p>
            </div>

            {(role === 'ADMIN' || role === 'GESTOR') && (
              <NavLink
                to="/config"
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-2 text-sm transition-colors ${
                    isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
                onClick={() => setOpen(false)}
              >
                <Settings className="h-4 w-4" strokeWidth={1.75} />
                <span>Configurações</span>
              </NavLink>
            )}

            <button
              onClick={() => {
                onOpenWhatsNew();
                setOpen(false);
              }}
              className="flex w-full items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <AlertCircle className={`h-4 w-4 ${hasWhatsNew ? 'text-red-600' : 'text-gray-600'}`} strokeWidth={1.75} />
              <span>Novidades</span>
              {hasWhatsNew ? <span className="ml-auto text-red-600 font-bold">!</span> : null}
            </button>

            <button
              onClick={() => {
                onLogout();
                setOpen(false);
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
  );
}

function Header({
  onOpenMobile,
  showUser,
  userName,
  userEmail,
  onLogout,
  hasWhatsNew,
  onOpenWhatsNew,
}: {
  onOpenMobile: () => void;
  showUser: boolean;
  userName: string;
  userEmail: string;
  onLogout: () => void;
  hasWhatsNew: boolean;
  onOpenWhatsNew: () => void;
}) {
  return (
    <header className="bg-black text-white px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-semibold font-advent">7Inventory</h1>
          <nav className="hidden md:flex items-center gap-4">
            <NavLinks />
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {showUser && <UserDropdown userName={userName} userEmail={userEmail} onLogout={onLogout} hasWhatsNew={hasWhatsNew} onOpenWhatsNew={onOpenWhatsNew} />}
          <button className="md:hidden rounded border px-2 py-2" onClick={onOpenMobile} aria-label="Abrir menu">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

function MobileSidebar({
  open,
  onClose,
  authToken,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  authToken: string | null | undefined;
  onLogout: () => void;
}) {
  const role = getUserRole();
  const items = navItems.filter(({ to }) => canAccessPath(role, to));
  const deptChildren = deptItems.filter(({ to }) => canAccessPath(role, to));
  const location = useLocation();
  const isDeptActive = deptChildren.some(({ to }) => location.pathname.startsWith(to));
  return !open ? null : (
    <div className="md:hidden">
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <aside className="fixed left-0 top-0 bottom-0 z-50 w-64 bg-black text-white">
        <div className="flex items-center justify-between px-4 py-4 text-sm font-semibold">
          <span className="font-advent">7inventory</span>
          <button className="rounded bg-white/10 px-2 py-1" onClick={onClose}>
            Fechar
          </button>
        </div>
        <nav className="space-y-1 px-2">
          {deptChildren.length > 0 && (
            <div className="mb-2">
              <div className={navClass({ isActive: isDeptActive })}>
                <Building2 className="h-4 w-4" strokeWidth={1.75} />
                <span>Departamentos</span>
              </div>
              <div className="ml-6 mt-1 space-y-1">
                {deptChildren.map(({ to, label, Icon }) => (
                  <NavLink key={to} to={to} className={navClass}>
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          )}
          {items.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} className={navClass}>
              <Icon className="h-4 w-4" strokeWidth={1.75} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="px-2 pb-4 pt-2">
          {authToken ? (
            <button
              className="w-full flex items-center gap-2 rounded bg-white px-3 py-2 text-black hover:opacity-90 text-sm"
              onClick={onLogout}
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} />
              <span>Sair</span>
            </button>
          ) : (
            <NavLink to="/login" className="flex items-center gap-2 rounded px-3 py-2 text-sm text-gray-200 hover:text-white hover:bg-white/10">
              <LogIn className="h-4 w-4" strokeWidth={1.75} />
              <span>Login</span>
            </NavLink>
          )}
        </div>
      </aside>
    </div>
  );
}

function WhatsNewModal({ open, onClose, version, items }: Readonly<{ open: boolean; onClose: () => void; version: string; items: string[] }>) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-100">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-xl rounded-lg bg-white shadow-lg">
        <div className="border-b px-4 py-3">
          <h3 className="text-lg font-semibold">Novidades na versão {version}</h3>
          <p className="text-xs text-gray-500">Veja o que foi atualizado</p>
        </div>
        <div className="px-4 py-3">
          <ul className="list-disc pl-5 space-y-2 text-sm">
            {items.map((it, idx) => (
              <li key={idx}>{it}</li>
            ))}
          </ul>
        </div>
        <div className="flex justify-end gap-2 border-t px-4 py-3">
          <button onClick={onClose} className="rounded bg-black px-4 py-2 text-white hover:opacity-90">Entendi</button>
        </div>
      </div>
    </div>
  );
}

// ---------- App ----------
export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const authToken = useAppStore((s) => s.authToken);
  const setAuthTokenState = useAppStore((s) => s.setAuthTokenState);

  const [mobileOpen, setMobileOpen] = useState(false);

  const userName = localStorage.getItem('userName') || '';
  const userEmail = localStorage.getItem('userEmail') || '';

  const isAuthRoute = ['/login', '/forgot-password', '/reset-password'].includes(location.pathname);

  // rolagem ao topo on route change
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  // fecha sidebar mobile na troca de rota
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const [dbIsDev, setDbIsDev] = useState(false);
  useEffect(() => {
    api.get('/api/health').then((resp) => {
      setDbIsDev(Boolean(resp?.data?.dbIsDev));
    }).catch(() => {});
  }, []);

  const onLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    setAuthTokenState('');
    navigate('/login');
  };

  const routeLabels: Record<string, string> = {
    '/': 'Dashboard',
    '/equipamentos': 'Gestão de Equipamentos',
    '/movimentacoes': 'Movimentações',
    '/escolas': 'Escolas',
    '/config': 'Configuração',
    '/relatorios': 'Relatórios',
    '/usuarios': 'Gestão de Usuários',
    '/centro-midia': 'Centro de Midia',
  };

  const whatsNewItems = [
    'Novo menu e tela Centro de Midia (somente ADMIN).',
    'Cadastro do Centro de Midia com filtros, paginação e CRUD.',
    'Fallback para armazenamento local quando a API retornar 404 no Centro de Midia.',
    'Melhoria: foco automático no campo Nome ao criar usuário.',
    'Proteções de rotas e visibilidade por perfil atualizadas.',
    'Adicionado um novo menu “Departamentos” com dropdown contendo “Equipamentos” e “Centro de Midia”.',
    'Adicionado filtro por departamento nos relatórios.',
    'Adicionado filtro por escola nos relatórios.',
  ];

  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const hasWhatsNew = (localStorage.getItem('lastSeenVersion') !== APP_VERSION);
  useEffect(() => {
    if (isAuthRoute) return;
    const lastVersion = localStorage.getItem('lastSeenVersion');
    if (lastVersion !== APP_VERSION) {
      setShowWhatsNew(true);
    }
  }, [isAuthRoute]);

  const openWhatsNew = () => setShowWhatsNew(true);
  const closeWhatsNew = () => {
    setShowWhatsNew(false);
    localStorage.setItem('lastSeenVersion', APP_VERSION);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Layout Auth isolado (sem header/sidebar) */}
      {isAuthRoute ? (
        <AuthLayout />
      ) : (
        <>
          <Header
            onOpenMobile={() => setMobileOpen(true)}
            showUser={!!authToken}
            userName={userName}
            userEmail={userEmail}
            onLogout={onLogout}
            hasWhatsNew={hasWhatsNew}
            onOpenWhatsNew={openWhatsNew}
          />
          <WhatsNewModal open={showWhatsNew} onClose={closeWhatsNew} version={APP_VERSION} items={whatsNewItems} />
          <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} authToken={authToken} onLogout={onLogout} />

          <main className="flex-1 p-6">
            <div className="mb-4 flex items-baseline justify-between">
              <div>
                <h2 className="text-xl font-semibold">{userName ? `Bem-vindo, ${userName}` : 'Bem-vindo'}</h2>
                <p className="text-xs text-gray-500">{routeLabels[location.pathname] || 'Página'}</p>
              </div>
              {dbIsDev && (
                <span className="ml-4 inline-flex items-center rounded bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800 border border-yellow-300">
                  Conectado ao banco de dados de desenvolvimento
                </span>
              )}
            </div>

            {/* Rotas privadas protegidas por RequireAuth */}
            <Routes>
              <Route element={<RequireAuth />}>
                <Route path="/" element={<EquipamentosPage />} />
                <Route path="/equipamentos" element={<EquipamentosPage />} />
                <Route path="/movimentacoes" element={<MovimentacoesPage />} />
                <Route path="/escolas" element={<EscolasPage />} />
                <Route path="/relatorios" element={<RelatoriosEquipamentosPage />} />
                <Route path="/usuarios" element={<RoleGuard allowed={['ADMIN','GESTOR']} children={<UsuariosPage />} />} />
                <Route path="/config" element={<RoleGuard allowed={['ADMIN','GESTOR']} children={<ConfigPage />} />} />
                <Route path="/centro-midia" element={<RoleGuard allowed={['ADMIN']} children={<CentroMidiaPage />} />} />
              </Route>

              {/* Rotas de auth (fallback caso usuário acesse fora do bloco AuthLayout) */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to={authToken ? '/equipamentos' : '/login'} replace />} />
            </Routes>
          </main>
        </>
      )}
    </div>
  );
}
function NavDropdown({ label, Icon, items }: Readonly<{ label: string; Icon: ComponentType<{ className?: string; strokeWidth?: number }>; items: { to: string; label: string; Icon: ComponentType<{ className?: string; strokeWidth?: number }> }[] }>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const isGroupActive = items.some(({ to }) => location.pathname.startsWith(to));
  useEffect(() => {
    const handler = (ev: MouseEvent) => {
      if (ref.current && !ref.current.contains(ev.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className={navClass({ isActive: isGroupActive })}>
        <Icon className="h-4 w-4" strokeWidth={1.75} />
        <span>{label}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} strokeWidth={1.75} />
      </button>
      {open && (
        <div className="absolute left-0 mt-2 w-56 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1">
            {items.map(({ to, label, Icon }) => (
              <NavLink key={to} to={to} className={({ isActive }) => `flex items-center space-x-3 px-4 py-2 text-sm transition-colors ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`} onClick={() => setOpen(false)}>
                <Icon className="h-4 w-4" strokeWidth={1.75} />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
