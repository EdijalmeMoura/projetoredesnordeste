import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Activity, Bell, Building2, CalendarDays, ChevronLeft, ChevronRight, ClipboardList, FileBarChart2, Home, LogOut, Menu, Plus, Search, Settings2, ShieldCheck, Users, UserRound, UserRoundCog, X } from 'lucide-react';
import Brand from '../../components/Brand';
import { useAuth } from '../../context/AuthContext';

const routeInfo: Record<string, string> = {
  '/admin/dashboard': 'Visão geral', '/admin/properties': 'Imóveis', '/admin/properties/new': 'Cadastrar imóvel',
  '/admin/leads': 'Interessados e leads', '/admin/owners': 'Proprietários', '/admin/agents': 'Corretores',
  '/admin/appointments': 'Agendamentos', '/admin/reports': 'Relatórios', '/admin/settings': 'Configurações do site',
  '/admin/audit': 'Auditoria', '/admin/users': 'Usuários e permissões', '/admin/privacy-requests': 'Solicitações de privacidade',
};
const coreNav = [
  { to: '/admin/dashboard', label: 'Visão geral', icon: Home },
  { to: '/admin/properties', label: 'Imóveis', icon: Building2 },
  { to: '/admin/properties/new', label: 'Cadastrar imóvel', icon: Plus },
  { to: '/admin/leads', label: 'Interessados e leads', icon: UserRound },
  { to: '/admin/owners', label: 'Proprietários', icon: Users },
  { to: '/admin/agents', label: 'Corretores', icon: UserRoundCog },
  { to: '/admin/appointments', label: 'Agendamentos', icon: CalendarDays },
  { to: '/admin/reports', label: 'Relatórios', icon: FileBarChart2 },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const location = useLocation(); const navigate = useNavigate();
  const title = routeInfo[location.pathname] || (location.pathname.includes('/edit') ? 'Editar imóvel' : 'Painel administrativo');
  const isAdmin = user?.role === 'administrator';
  const canManage = ['administrator', 'manager'].includes(user?.role || '');
  const links = coreNav.filter((item) => {
    if (['/admin/owners', '/admin/agents', '/admin/appointments'].includes(item.to) && !canManage && user?.role !== 'agent') return false;
    if (item.to === '/admin/reports' && user?.role === 'agent') return false;
    if (item.to === '/admin/properties/new' && user?.role === 'agent') return false;
    return true;
  });
  const secondary = [
    ...(isAdmin ? [{ to: '/admin/settings', label: 'Configurações do site', icon: Settings2 }] : []),
    ...(isAdmin ? [{ to: '/admin/users', label: 'Usuários e permissões', icon: ShieldCheck }, { to: '/admin/privacy-requests', label: 'Solicitações LGPD', icon: ShieldCheck }, { to: '/admin/audit', label: 'Auditoria', icon: Activity }] : []),
  ];
  const closeMobile = () => setMobileOpen(false);
  const doSearch = (event: React.FormEvent) => { event.preventDefault(); if (search.trim()) navigate(`/admin/properties?search=${encodeURIComponent(search.trim())}`); };
  return <div className={`admin-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
    {mobileOpen && <button className="admin-mobile-scrim" aria-label="Fechar menu" onClick={closeMobile} />}
    <aside className={`admin-sidebar ${mobileOpen ? 'admin-sidebar-open' : ''}`}>
      <div className="admin-brand-row"><Brand compact /><button className="sidebar-collapse" aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'} onClick={() => setCollapsed(!collapsed)}>{collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}</button><button className="sidebar-mobile-close" onClick={closeMobile} aria-label="Fechar menu"><X size={19} /></button></div>
      <div className="workspace-label"><span className="workspace-mark">RN</span><div><strong>Redes Nordeste</strong><small>Área administrativa</small></div><ChevronRight size={15} /></div>
      <div className="sidebar-section-label">MENU PRINCIPAL</div>
      <nav className="admin-nav">{links.map((item) => { const Icon = item.icon; return <NavLink key={item.to} to={item.to} end={item.to === '/admin/properties'} onClick={closeMobile} className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`} title={collapsed ? item.label : undefined}><Icon size={18} /><span>{item.label}</span>{item.to === '/admin/leads' && <span className="nav-live-dot" />}</NavLink>; })}</nav>
      {secondary.length > 0 && <><div className="sidebar-section-label sidebar-secondary-label">SISTEMA</div><nav className="admin-nav">{secondary.map((item) => { const Icon = item.icon; return <NavLink key={item.to} to={item.to} onClick={closeMobile} className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`} title={collapsed ? item.label : undefined}><Icon size={18} /><span>{item.label}</span></NavLink>; })}</nav></>}
      <div className="sidebar-bottom"><div className="sidebar-help-card"><div className="help-card-icon"><ShieldCheck size={17} /></div><strong>Seus dados, protegidos.</strong><p>O acesso é controlado pelo seu perfil.</p></div><button className="sidebar-logout" onClick={() => { void logout(); navigate('/admin/login'); }}><LogOut size={17} /><span>Sair da conta</span></button></div>
    </aside>
    <div className="admin-workspace">
      <header className="admin-topbar"><button className="admin-menu-button" onClick={() => setMobileOpen(true)} aria-label="Abrir menu"><Menu size={21} /></button><div className="admin-top-title"><span>PAINEL</span><h1>{title}</h1></div><form className="admin-global-search" onSubmit={doSearch}><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar imóvel, código..." aria-label="Buscar no painel" /><kbd>↵</kbd></form><button className="topbar-notifications" aria-label="Ir para interessados" onClick={() => navigate('/admin/leads')}><Bell size={18} /></button><div className="topbar-divider" /><div className="admin-user-chip"><div className="admin-user-avatar">{user?.name?.slice(0, 1).toUpperCase() || 'U'}</div><div><strong>{user?.name}</strong><small>{user?.role === 'administrator' ? 'Administrador' : user?.role === 'manager' ? 'Gerente' : user?.role === 'agent' ? 'Corretor' : 'Editor'}</small></div></div></header>
      <main className="admin-content"><Outlet /></main>
      <footer className="admin-footer"><span>Projeto Redes Nordeste · Gestão imobiliária</span><span>Dados sincronizados nesta instalação.</span></footer>
    </div>
  </div>;
}
