import { Suspense, lazy, useCallback, useEffect, useState, useRef } from 'react';
import type { ComponentType, RefObject } from 'react';
import { NavLink, Route, Routes, useLocation, useNavigate, Navigate, Outlet } from 'react-router-dom';
import { Monitor, Shuffle, School, Settings, LogIn, Menu, FileText, User, LogOut, ChevronDown, Image, AlertCircle, Building2, ClipboardList } from 'lucide-react';
import LogoSystem from './assets/Logo_System.svg';
import './index.css';
import EquipamentosPage from './pages/Equipamentos';
import EscolasPage from './pages/Escolas';
import ConfigPage from './pages/Config';
import LoginPage from './pages/Login';
import UsuariosPage from './pages/Usuarios';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import { useAppStore } from './store/useAppStore';
import api from './lib/axios';
import { isExpired } from './utils/validity';
const APP_VERSION = (import.meta.env.VITE_APP_VERSION as string) || '1.2.3';

const MovimentacoesPage = lazy(() => import('./pages/Movimentacoes'));
const RelatoriosEquipamentosPage = lazy(() => import('./pages/RelatoriosEquipamentos'));
const AuditoriaPage = lazy(() => import('./pages/Auditoria'));
const RelatorioEquipamentoPage = lazy(() => import('./pages/RelatorioEquipamento'));
const CentroMidiaPage = lazy(() => import('./pages/CentroMidia'));

// ---------- Helpers ----------
const navItems = [
  { to: '/movimentacoes', label: 'Movimentações', Icon: Shuffle },
  { to: '/escolas', label: 'Escolas', Icon: School },
  { to: '/relatorios', label: 'Relatórios', Icon: FileText },
  { to: '/auditoria', label: 'Auditoria', Icon: ClipboardList },
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
  if (path === '/centro-midia') return true;
  if (path === '/auditoria') return role === 'ADMIN' || role === 'GESTOR';
  if (role === 'ADMIN' || role === 'GESTOR') return true;
  return path !== '/config' && path !== '/usuarios';
};

// ---------- Guards / Layouts ----------
function RequireAuth() {
  const authToken = useAppStore((s) => s.authToken);
  return authToken ? <Outlet /> : <Navigate to="/login" replace />;
}

function RouteFallback() {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <span className="text-sm text-gray-500">Carregando página...</span>
    </div>
  );
}

function RoleGuard({ allowed, children }: Readonly<{ allowed: Role[]; children: React.ReactElement }>) {
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
function useOutsideDismiss(
  open: boolean,
  setClosed: () => void,
  buttonRef: RefObject<HTMLButtonElement | null>,
  panelRef: RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    if (!open) return undefined;
    const handler = (ev: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(ev.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(ev.target as Node)
      ) {
        setClosed();
      }
    };
    const keyHandler = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        setClosed();
        window.requestAnimationFrame(() => buttonRef.current?.focus());
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [open, buttonRef, panelRef, setClosed]);
}

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
}: Readonly<{
  userName: string;
  userEmail: string;
  onLogout: () => void;
  hasWhatsNew: boolean;
  onOpenWhatsNew: () => void;
}>) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const role = getUserRole();
  const fecharUserMenu = useCallback(() => setOpen(false), []);
  useOutsideDismiss(open, fecharUserMenu, buttonRef, panelRef);

  useEffect(() => {
    if (!open) return;
    window.requestAnimationFrame(() => {
      const first = panelRef.current?.querySelector<HTMLElement>('a,button');
      first?.focus();
    });
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center space-x-2 rounded px-3 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-white/10"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? 'user-menu-panel' : undefined}
      >
        <div className="relative rounded-full p-1.5 bg-gray-700">
          <User className="h-4 w-4 text-gray-300" strokeWidth={1.75} aria-hidden />
          {hasWhatsNew ? (
            <span
              className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-600 ring-2 ring-black"
              aria-label="Há novidades não lidas"
            />
          ) : null}
        </div>
        <span>{userName || 'Usuário'}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} strokeWidth={1.75} aria-hidden />
      </button>

      {open && (
        <div
          ref={panelRef}
          id="user-menu-panel"
          className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-50"
          role="menu"
          aria-label="Menu do usuário"
        >
          <div className="py-1">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900">{userName || 'Usuário'}</p>
              <p className="text-xs text-gray-500">{userEmail || 'email@exemplo.com'}</p>
            </div>

            {(role === 'ADMIN' || role === 'GESTOR') && (
              <NavLink
                to="/config"
                role="menuitem"
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-2 text-sm transition-colors ${
                    isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
                onClick={() => setOpen(false)}
              >
                <Settings className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                <span>Configurações</span>
              </NavLink>
            )}

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onOpenWhatsNew();
                setOpen(false);
              }}
              className="flex w-full items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <AlertCircle className={`h-4 w-4 ${hasWhatsNew ? 'text-red-600' : 'text-gray-600'}`} strokeWidth={1.75} aria-hidden />
              <span>Novidades</span>
              {hasWhatsNew ? <span className="ml-auto text-red-600 font-bold">!</span> : null}
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onLogout();
                setOpen(false);
              }}
              className="flex w-full items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} aria-hidden />
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
  openMobile,
  showUser,
  userName,
  userEmail,
  onLogout,
  hasWhatsNew,
  onOpenWhatsNew,
  version,
  expiredCount,
  maintenanceCount,
  discardedCount,
}: Readonly<{
  onOpenMobile: () => void;
  openMobile: boolean;
  showUser: boolean;
  userName: string;
  userEmail: string;
  onLogout: () => void;
  hasWhatsNew: boolean;
  onOpenWhatsNew: () => void;
  version: string;
  expiredCount: number;
  maintenanceCount: number;
  discardedCount: number;
}>) {
  return (
    <header role="banner" className="bg-black text-white px-6 py-4">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:rounded focus:bg-white focus:px-3 focus:py-1 focus:text-black focus:outline-none focus:ring-2 focus:ring-blue-500">
        Pular para o conteúdo principal
      </a>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <a href="/" className="flex items-center gap-3" aria-label="Página inicial 7Inventory">
            <img src="/header-logo.svg" alt="" className="h-14 w-14" aria-hidden />
            <span className="sr-only">7Inventory</span>
          </a>
          <span className="inline-flex items-center rounded bg-white/10 px-2 py-0.5 text-xs text-gray-300" aria-label={`Versão ${version} do sistema`}>v{version}</span>
          <nav aria-label="Navegação principal" className="hidden md:flex items-center gap-4">
            <NavLinks />
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div
            className="relative flex items-center mr-2"
            aria-label={discardedCount > 0 ? `${discardedCount} computadores descartados` : 'Nenhum computador descartado'}
          >
            <span className={`material-symbols-outlined transition-colors duration-500 ${discardedCount > 0 ? 'text-yellow-500' : 'text-green-500'}`} style={{ fontSize: '28px' }} aria-hidden>computer_cancel</span>
            {discardedCount > 0 && (
              <span className="absolute -top-1 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-black" aria-live="polite">
                {discardedCount}
              </span>
            )}
          </div>
          <div
            className="relative flex items-center mr-2"
            aria-label={maintenanceCount > 0 ? `${maintenanceCount} equipamentos em manutenção` : 'Nenhum equipamento em manutenção'}
          >
            <span className={`material-symbols-outlined transition-colors duration-500 ${maintenanceCount > 0 ? 'text-yellow-500' : 'text-green-500'}`} style={{ fontSize: '28px' }} aria-hidden>build</span>
            {maintenanceCount > 0 && (
              <span className="absolute -top-1 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-black" aria-live="polite">
                {maintenanceCount}
              </span>
            )}
          </div>
          {expiredCount > 0 && (
            <div
              className="relative flex items-center mr-2"
              aria-label={`${expiredCount} equipamentos vencidos`}
            >
              <span className="material-symbols-outlined text-yellow-500" style={{ fontSize: '28px' }} aria-hidden>warning</span>
              <span className="absolute -top-1 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-black" aria-live="polite">
                {expiredCount}
              </span>
            </div>
          )}
          {showUser && <UserDropdown userName={userName} userEmail={userEmail} onLogout={onLogout} hasWhatsNew={hasWhatsNew} onOpenWhatsNew={onOpenWhatsNew} />}
          <button type="button" className="md:hidden rounded border px-2 py-2" onClick={onOpenMobile} aria-label="Abrir menu de navegação" aria-expanded={openMobile}>
            <Menu className="h-5 w-5" aria-hidden />
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
}: Readonly<{
  open: boolean;
  onClose: () => void;
  authToken: string | null | undefined;
  onLogout: () => void;
}>) {
  const role = getUserRole();
  const items = navItems.filter(({ to }) => canAccessPath(role, to));
  const deptChildren = deptItems.filter(({ to }) => canAccessPath(role, to));
  const location = useLocation();
  const isDeptActive = deptChildren.some(({ to }) => location.pathname.startsWith(to));
  const sidebarRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!open) return;
    const dialog = sidebarRef.current;
    if (!dialog) return;
    window.requestAnimationFrame(() => {
      dialog.showModal();
      const first = dialog.querySelector<HTMLElement>('a,button');
      first?.focus();
    });
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <dialog
      ref={sidebarRef}
      className="m-0 border-0 p-0 bg-transparent max-w-none max-h-none w-screen h-screen fixed inset-0 md:hidden backdrop:bg-black/50 z-40"
      aria-label="Menu de navegação"
      onCancel={onClose}
      onClose={onClose}
    >
      <div className="relative w-full h-full flex justify-start">
        <button
          type="button"
          aria-label="Fechar menu de navegação"
          onClick={onClose}
          tabIndex={-1}
          className="absolute inset-0 m-0 border-0 p-0 bg-transparent cursor-default"
        />
      <aside
        className="relative z-10 flex h-full w-64 flex-col bg-black text-white"
      >
        <div className="flex items-center justify-between px-4 py-4 text-sm font-semibold">
          <span className="font-advent">7inventory</span>
          <button type="button" className="rounded bg-white/10 px-2 py-1" onClick={onClose} aria-label="Fechar menu de navegação">
            Fechar
          </button>
        </div>
        <nav aria-label="Navegação secundária (menu móvel)" className="space-y-1 px-2 flex-1">
          {deptChildren.length > 0 && (
            <div className="mb-2">
              <div className={navClass({ isActive: isDeptActive })}>
                <Building2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                <span>Departamentos</span>
              </div>
              <div className="ml-6 mt-1 space-y-1">
                {deptChildren.map(({ to, label, Icon }) => (
                  <NavLink key={to} to={to} className={navClass} onClick={onClose}>
                    <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          )}
          {items.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} className={navClass} onClick={onClose}>
              <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="px-2 pb-4 pt-2">
          {authToken ? (
            <button
              type="button"
              className="w-full flex items-center gap-2 rounded bg-white px-3 py-2 text-black hover:opacity-90 text-sm"
              onClick={onLogout}
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              <span>Sair</span>
            </button>
          ) : (
            <NavLink to="/login" className="flex items-center gap-2 rounded px-3 py-2 text-sm text-gray-200 hover:text-white hover:bg-white/10">
              <LogIn className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              <span>Login</span>
            </NavLink>
          )}
        </div>
      </aside>
      </div>
    </dialog>
  );
}

function WhatsNewModal({ open, onClose, version, items }: Readonly<{ open: boolean; onClose: () => void; version: string; items: string[] }>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (!dialog) return;
    window.requestAnimationFrame(() => {
      dialog.showModal();
      const first = dialog.querySelector<HTMLElement>('button,input,select,textarea');
      first?.focus();
    });
    return () => {
      if (dialog.open) dialog.close();
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    };
  }, [open]);

  function handleClose() {
    if (dialogRef.current?.open) {
      dialogRef.current.close();
    }
    onClose();
  }

  if (!open) return null;
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="whatsnew-title"
      aria-describedby="whatsnew-desc"
      onCancel={handleClose}
      onClose={handleClose}
      className="m-0 border-0 p-0 bg-transparent max-w-none max-h-none w-screen h-screen fixed inset-0 z-[100] backdrop:bg-black/50"
    >
      <div className="relative w-full h-full flex items-center justify-center">
        <button
          type="button"
          aria-label="Fechar novidades da versão"
          onClick={handleClose}
          tabIndex={-1}
          className="absolute inset-0 m-0 border-0 p-0 bg-transparent cursor-default"
        />
      <div
        className="relative z-10 w-[95%] max-w-xl rounded-lg bg-white shadow-lg"
      >
        <div className="border-b px-4 py-3">
          <h3 id="whatsnew-title" className="text-lg font-semibold">Novidades na versão {version}</h3>
          <p id="whatsnew-desc" className="text-xs text-gray-500">Veja o que foi atualizado</p>
        </div>
        <div className="px-4 py-3">
          <ul className="list-disc pl-5 space-y-2 text-sm">
            {items.map((it) => (
              <li key={it}>{it}</li>
            ))}
          </ul>
        </div>
        <div className="flex justify-end gap-2 border-t px-4 py-3">
          <button type="button" onClick={handleClose} className="rounded bg-black px-4 py-2 text-white hover:opacity-90">Entendi</button>
        </div>
      </div>
      </div>
    </dialog>
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
  const [dbHost, setDbHost] = useState<string | null>(null);

  useEffect(() => {
    api.get('/api/health').then((resp) => {
      const payload = resp?.data ?? {};
      setDbIsDev(Boolean(payload.dbIsDev));
      setDbHost(typeof payload.dbHost === 'string' ? payload.dbHost : null);
    }).catch(() => {
      setDbIsDev(false);
      setDbHost(null);
    });
  }, []);

  const expiredCount = useAppStore((state) => state.expiredCount);
  const setExpiredCount = useAppStore((state) => state.setExpiredCount);
  const maintenanceCount = useAppStore((state) => state.maintenanceCount);
  const setMaintenanceCount = useAppStore((state) => state.setMaintenanceCount);
  const discardedCount = useAppStore((state) => state.discardedCount);
  const setDiscardedCount = useAppStore((state) => state.setDiscardedCount);

  useEffect(() => {
    const excludedPaths = ['/equipamentos', '/relatorios', '/auditoria', '/centro-midia', '/movimentacoes', '/'];
    if (authToken && !excludedPaths.includes(location.pathname)) {
      api.get('/api/equipamentos').then((res) => {
        const list = res.data?.data || res.data || [];
        if (Array.isArray(list)) {
          const count = list.filter((item: { dataAquisicao?: string }) => isExpired(item.dataAquisicao)).length;
          setExpiredCount(count);
          const maintCount = list.filter((item: { status?: string }) => item.status === 'EM_MANUTENCAO').length;
          setMaintenanceCount(maintCount);
          const discCount = list.filter((item: { status?: string }) => item.status === 'DESCARTADO').length;
          setDiscardedCount(discCount);
        }
      }).catch(() => {});
    }
  }, [authToken, location.pathname, setExpiredCount, setMaintenanceCount, setDiscardedCount]);

  const onLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEscolaNome');
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
    '/auditoria': 'Auditoria de Importações',
    '/usuarios': 'Gestão de Usuários',
    '/centro-midia': 'Centro de Midia',
  };

  const whatsNewItems = [
    'Nova Feature: Importação de arquivos pelo WinAudit.',
    'Nova Feature: Relatórios de Auditoria de importação de dados.',
    'Bug Fixed: Melhorias internas no sistema.',
    'Bug Fixed: Melhorias no tratamentos de erros.'    
  ];

  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const hasWhatsNew = (localStorage.getItem('lastSeenVersion') !== APP_VERSION);
  const isEquipmentReportRoute = /^\/equipamentos\/[^/]+\/relatorio$/.test(location.pathname);
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
  const canScroll = location.pathname === '/relatorios' || isEquipmentReportRoute;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Layout Auth isolado (sem header/sidebar) */}
      {isAuthRoute ? (
        <AuthLayout />
      ) : (
        <>
          <Header
            onOpenMobile={() => setMobileOpen(true)}
            openMobile={mobileOpen}
            showUser={!!authToken}
            userName={userName}
            userEmail={userEmail}
            onLogout={onLogout}
            hasWhatsNew={hasWhatsNew}
            onOpenWhatsNew={openWhatsNew}
            version={APP_VERSION}
            expiredCount={expiredCount}
            maintenanceCount={maintenanceCount}
            discardedCount={discardedCount}
          />
          <WhatsNewModal open={showWhatsNew} onClose={closeWhatsNew} version={APP_VERSION} items={whatsNewItems} />
          <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} authToken={authToken} onLogout={onLogout} />

          <main id="main-content" role="main" className={`flex-1 p-6 pb-20 ${canScroll ? 'overflow-auto' : 'overflow-hidden'}`} tabIndex={-1}>
            <div className="mb-4 flex items-baseline justify-between">
              <div>
                <h2 className="text-xl font-semibold">{userName ? `Bem-vindo, ${userName}` : 'Bem-vindo'}</h2>
                <p className="text-xs text-gray-500">{isEquipmentReportRoute ? 'Relatório do Equipamento' : (routeLabels[location.pathname] || 'Página')}</p>
              </div>
              <div className="flex items-center gap-4">
                {dbIsDev && (
                  <span
                    role="alert"
                    aria-label={dbHost ? `Conectado ao banco de dados de desenvolvimento - ${dbHost}` : 'Conectado ao banco de dados de desenvolvimento'}
                    className="text-red-400 font-bold ml-3"
                  >
                    (Conectado ao banco de dados de desenvolvimento{dbHost ? ` - ${dbHost}` : ''})
                  </span>
                )}
              </div>
            </div>

            {/* Rotas privadas protegidas por RequireAuth */}
            <Routes>
              <Route element={<RequireAuth />}>
                <Route path="/" element={<EquipamentosPage />} />
                <Route path="/equipamentos" element={<EquipamentosPage />} />
                <Route path="/equipamentos/:id/relatorio" element={<Suspense fallback={<RouteFallback />}><RelatorioEquipamentoPage /></Suspense>} />
                <Route path="/movimentacoes" element={<Suspense fallback={<RouteFallback />}><MovimentacoesPage /></Suspense>} />
                <Route path="/escolas" element={<EscolasPage />} />
                <Route path="/relatorios" element={<Suspense fallback={<RouteFallback />}><RelatoriosEquipamentosPage /></Suspense>} />
                <Route path="/auditoria" element={<RoleGuard allowed={['ADMIN','GESTOR']}><Suspense fallback={<RouteFallback />}><AuditoriaPage /></Suspense></RoleGuard>} />
                <Route path="/usuarios" element={<RoleGuard allowed={['ADMIN','GESTOR']}><UsuariosPage /></RoleGuard>} />
                <Route path="/config" element={<RoleGuard allowed={['ADMIN','GESTOR']}><ConfigPage /></RoleGuard>} />
                <Route path="/centro-midia" element={<Suspense fallback={<RouteFallback />}><CentroMidiaPage /></Suspense>}/>
              </Route>

              {/* Rotas de auth (fallback caso usuário acesse fora do bloco AuthLayout) */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to={authToken ? '/equipamentos' : '/login'} replace />} />
            </Routes>
          </main>
          <footer role="contentinfo" className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-sm py-1 flex items-center justify-end px-6">
            <img src={LogoSystem} alt="" aria-hidden className="h-14" />
          </footer>
        </>
      )}
    </div>
  );
}
function NavDropdown({ label, Icon, items }: Readonly<{ label: string; Icon: ComponentType<{ className?: string; strokeWidth?: number }>; items: { to: string; label: string; Icon: ComponentType<{ className?: string; strokeWidth?: number }> }[] }>) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const isGroupActive = items.some(({ to }) => location.pathname.startsWith(to));
  const fecharNavMenu = useCallback(() => setOpen(false), []);
  useOutsideDismiss(open, fecharNavMenu, buttonRef, panelRef);
  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={navClass({ isActive: isGroupActive })}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? 'nav-departamentos' : undefined}
      >
        <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        <span>{label}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} strokeWidth={1.75} aria-hidden />
      </button>
      {open && (
        <div
          ref={panelRef}
          id="nav-departamentos"
          className="absolute left-0 mt-2 w-56 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-50"
          role="menu"
          aria-label="Departamentos"
        >
          <div className="py-1">
            {items.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                role="menuitem"
                className={({ isActive }) => `flex items-center space-x-3 px-4 py-2 text-sm transition-colors ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
                onClick={() => setOpen(false)}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
