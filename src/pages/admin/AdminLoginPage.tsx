import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, LockKeyhole } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Brand from '../../components/Brand';
import { useAuth } from '../../context/AuthContext';

export default function AdminLoginPage() {
  const { user, loading: checking, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  if (checking) return <div className="admin-login-loading" />;
  if (user) return <Navigate to="/admin/dashboard" replace />;
  const onSubmit = async (event: FormEvent) => {
    event.preventDefault(); setSubmitting(true); setError('');
    try { await login(email, password); navigate('/admin/dashboard', { replace: true }); }
    catch (issue) { setError((issue as Error).message); }
    finally { setSubmitting(false); }
  };
  return <div className="admin-login-page"><div className="admin-login-left"><div className="admin-login-brand"><Brand inverse /><Link to="/" className="login-back"><ArrowLeft size={15} /> Voltar ao site</Link></div><div className="admin-login-copy"><span className="eyebrow eyebrow-light">ÁREA DA EQUIPE</span><h1>Gestão simples.<br /><em>Boas conexões.</em></h1><p>Um espaço para acompanhar imóveis, conversas e próximos passos.</p><div className="login-decor"><span /><span /><span /></div></div><div className="admin-login-foot">Projeto Redes Nordeste · Acesso administrativo</div></div><div className="admin-login-right"><div className="login-mobile-brand"><Brand /></div><div className="login-form-wrap"><div className="login-lock"><LockKeyhole size={22} /></div><span className="eyebrow">BEM-VINDO DE VOLTA</span><h2>Entre na sua conta.</h2><p>Acesse o painel para continuar.</p><form onSubmit={onSubmit} className="login-form"><label className="form-field"><span>E-mail</span><input autoComplete="username" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" /></label><label className="form-field"><span>Senha</span><input autoComplete="current-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Sua senha" /></label>{error && <p className="form-error">{error}</p>}<button className="button button-primary button-full" disabled={submitting}>{submitting ? 'Acessando…' : 'Entrar no painel'} <ArrowRight size={16} /></button></form><div className="login-security"><LockKeyhole size={14} /><span>Acesso protegido por autenticação e controle de permissões.</span></div></div><Link to="/" className="login-site-link">Explorar o site público <ArrowRight size={14} /></Link></div></div>;
}
