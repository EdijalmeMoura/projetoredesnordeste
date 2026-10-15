import { useEffect } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import PublicLayout from './pages/PublicLayout';
import HomePage from './pages/HomePage';
import PropertiesPage from './pages/PropertiesPage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import AnnouncePage from './pages/AnnouncePage';
import ContactPage from './pages/ContactPage';
import ContentPage from './pages/ContentPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminLayout from './pages/admin/AdminLayout';
import DashboardPage from './pages/admin/DashboardPage';
import PropertiesAdminPage from './pages/admin/PropertiesAdminPage';
import PropertyEditorPage from './pages/admin/PropertyEditorPage';
import LeadsPage from './pages/admin/LeadsPage';
import { AgentsAdminPage, OwnersAdminPage } from './pages/admin/PeopleAdminPages';
import AppointmentsPage from './pages/admin/AppointmentsPage';
import ReportsPage from './pages/admin/ReportsPage';
import SettingsPage from './pages/admin/SettingsPage';
import UsersPage from './pages/admin/UsersPage';
import AuditPage from './pages/admin/AuditPage';
import PrivacyRequestsPage from './pages/admin/PrivacyRequestsPage';
import { useAuth as useAuthHook } from './context/AuthContext';
import { useToast } from './context/ToastContext';
import { api } from './lib/api';
import { useState } from 'react';
import { ArrowLeft, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';

function AdminGate() {
  const { user, loading } = useAuth();
  if (loading) return <div className="admin-login-loading" />;
  if (!user) return <Navigate to="/admin/login" replace />;
  return <Outlet />;
}
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}
function PublicContent({ slug }: { slug: string }) { return <ContentPage slug={slug} />; }
function ProtectedPage({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user } = useAuthHook(); const { notify } = useToast();
  useEffect(() => { if (roles && user && !roles.includes(user.role)) notify('Seu perfil não tem permissão para acessar essa área.', 'error'); }, [roles, user, notify]);
  if (!user || (roles && !roles.includes(user.role))) return <Navigate to="/admin/dashboard" replace />;
  return <>{children}</>;
}
function NotFoundPage() {
  return <div className="container not-found-state"><div className="empty-illustration"><Building2 size={27} /></div><span className="eyebrow">404 · PÁGINA NÃO ENCONTRADA</span><h1>Este caminho ainda não existe.</h1><p>Confira o endereço ou volte para explorar os imóveis.</p><Link to="/" className="button button-primary"><ArrowLeft size={16} /> Ir para o início</Link></div>;
}

function AppRoutes() {
  return <><ScrollToTop /><Routes>
    <Route path="/" element={<PublicLayout />}>
      <Route index element={<HomePage />} />
      <Route path="imoveis" element={<PropertiesPage />} />
      <Route path="imovel/:slug" element={<PropertyDetailPage />} />
      <Route path="anuncie" element={<AnnouncePage />} />
      <Route path="contato" element={<ContactPage />} />
      <Route path="sobre" element={<PublicContent slug="sobre" />} />
      <Route path="privacidade" element={<PublicContent slug="privacidade" />} />
      <Route path="termos" element={<PublicContent slug="termos" />} />
      <Route path="comprar" element={<Navigate to="/imoveis?purpose=sale" replace />} />
      <Route path="alugar" element={<Navigate to="/imoveis?purpose=rent" replace />} />
      <Route path="anuncie-seu-imovel" element={<Navigate to="/anuncie" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
    <Route path="/admin/login" element={<AdminLoginPage />} />
    <Route path="/admin" element={<AdminGate />}>
      <Route element={<AdminLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="properties" element={<PropertiesAdminPage />} />
        <Route path="properties/new" element={<PropertyEditorPage />} />
        <Route path="properties/:id/edit" element={<PropertyEditorPage />} />
        <Route path="leads" element={<LeadsPage />} />
        <Route path="owners" element={<ProtectedPage roles={['administrator', 'manager']}><OwnersAdminPage /></ProtectedPage>} />
        <Route path="agents" element={<ProtectedPage roles={['administrator', 'manager']}><AgentsAdminPage /></ProtectedPage>} />
        <Route path="appointments" element={<ProtectedPage roles={['administrator', 'manager', 'agent']}><AppointmentsPage /></ProtectedPage>} />
        <Route path="reports" element={<ProtectedPage roles={['administrator', 'manager']}><ReportsPage /></ProtectedPage>} />
        <Route path="settings" element={<ProtectedPage roles={['administrator']}><SettingsPage /></ProtectedPage>} />
        <Route path="users" element={<ProtectedPage roles={['administrator']}><UsersPage /></ProtectedPage>} />
        <Route path="audit" element={<ProtectedPage roles={['administrator']}><AuditPage /></ProtectedPage>} />
        <Route path="privacy-requests" element={<ProtectedPage roles={['administrator']}><PrivacyRequestsPage /></ProtectedPage>} />
      </Route>
    </Route>
    <Route path="*" element={<NotFoundPage />} />
  </Routes></>;
}

export default function App() {
  return <BrowserRouter><AuthProvider><ToastProvider><AppRoutes /></ToastProvider></AuthProvider></BrowserRouter>;
}
