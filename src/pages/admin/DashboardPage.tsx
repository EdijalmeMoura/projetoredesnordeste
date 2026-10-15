import { useEffect, useState } from 'react';
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Building2, CircleDollarSign, Eye, Home, Plus, UserRound, UsersRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../../lib/api';
import { formatDate, formatMonth } from '../../lib/format';

interface Overview {
  metrics: { properties: number; published: number; available: number; negotiation: number; sold: number; rented: number; leads: number; openLeads: number };
  monthlyProperties: { month: string; total: number }[];
  propertiesByPurpose: { name: string; value: number }[];
  propertiesByCity: { name: string; value: number }[];
  leadsByMonth: { month: string; total: number }[];
  recentActivity: Record<string, unknown>[];
  demoCount: number;
}
const chartColors = ['#176B87', '#2FB47C', '#7BB7C8', '#E7A84B', '#A4A9B4', '#82C9AA'];
const actionNames: Record<string, string> = { 'property.created': 'Novo imóvel cadastrado', 'property.updated': 'Imóvel atualizado', 'property.published': 'Imóvel publicado', 'property.archived': 'Imóvel arquivado', 'lead.status_changed': 'Etapa de lead atualizada', 'lead.activity_added': 'Interação registrada', 'owner.created': 'Proprietário cadastrado', 'agent.created': 'Corretor cadastrado', 'appointment.created': 'Visita agendada', 'settings.updated': 'Configurações atualizadas', 'auth.login': 'Acesso ao painel' };

export default function DashboardPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  useEffect(() => { api<Overview>('/api/admin/overview').then(setData).catch((issue) => setError(issue.message)); }, []);
  if (error) return <div className="admin-error-card"><Activity size={20} /><h2>Não foi possível carregar o resumo.</h2><p>{error}</p></div>;
  if (!data) return <div className="dashboard-loading"><div /><div /><div /><div /></div>;
  const m = data.metrics;
  const purposeLabels = (name: string) => ({ sale: 'Venda', rent: 'Aluguel', both: 'Venda e aluguel' }[name] || name);
  return <div className="dashboard-page">
    <div className="admin-page-heading"><div><span className="eyebrow">SEU PAINEL DE CONTROLE</span><h2>Visão geral</h2><p>Uma leitura rápida do que está acontecendo na sua operação.</p></div><div className="heading-actions"><Link to="/admin/properties/new" className="button button-primary"><Plus size={17} /> Novo imóvel</Link><Link to="/admin/leads" className="button button-outline">Ver interessados <ArrowRight size={16} /></Link></div></div>
    {data.demoCount > 0 && <div className="admin-demo-banner"><span><Eye size={16} /></span><p>Este ambiente contém <strong>{data.demoCount} registros demonstrativos</strong> identificados como exemplo. Os indicadores abaixo são calculados diretamente do banco desta instalação.</p><Link to="/admin/properties">Revisar imóveis <ArrowRight size={14} /></Link></div>}
    <div className="metric-grid">
      <button className="metric-card metric-card-navy" onClick={() => navigate('/admin/properties')}><div className="metric-card-top"><span>Total de imóveis</span><span className="metric-icon"><Building2 size={18} /></span></div><strong>{m.properties}</strong><div className="metric-card-foot"><span>{m.published} publicados</span><ArrowUpRight size={15} /></div></button>
      <button className="metric-card" onClick={() => navigate('/admin/properties?availability_status=available')}><div className="metric-card-top"><span>Disponíveis</span><span className="metric-icon green"><Home size={18} /></span></div><strong>{m.available}</strong><div className="metric-card-foot"><span>{m.negotiation} em reserva ou negociação</span><ArrowUpRight size={15} /></div></button>
      <button className="metric-card" onClick={() => navigate('/admin/properties?availability_status=sold')}><div className="metric-card-top"><span>Negócios concluídos</span><span className="metric-icon gold"><CircleDollarSign size={18} /></span></div><strong>{m.sold + m.rented}</strong><div className="metric-card-foot"><span>{m.sold} vendidos · {m.rented} alugados</span><ArrowUpRight size={15} /></div></button>
      <button className="metric-card" onClick={() => navigate('/admin/leads')}><div className="metric-card-top"><span>Leads recebidos</span><span className="metric-icon blue"><UsersRound size={18} /></span></div><strong>{m.leads}</strong><div className="metric-card-foot"><span>{m.openLeads} aguardando atendimento</span><ArrowUpRight size={15} /></div></button>
    </div>
    <div className="dashboard-chart-grid">
      <section className="admin-panel chart-panel"><div className="panel-heading"><div><span className="eyebrow">MOVIMENTO DO CATÁLOGO</span><h3>Cadastros por mês</h3></div><span className="panel-icon"><Building2 size={17} /></span></div><div className="chart-area">{data.monthlyProperties.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={data.monthlyProperties} margin={{ top: 12, right: 6, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8EDF1" /><XAxis dataKey="month" tickFormatter={formatMonth} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8592A0' }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8592A0' }} /><Tooltip formatter={(value) => [value, 'Imóveis']} labelFormatter={(label) => formatMonth(String(label))} /><Bar dataKey="total" fill="#176B87" radius={[5, 5, 0, 0]} maxBarSize={38} /></BarChart></ResponsiveContainer> : <div className="chart-empty">Cadastros serão exibidos quando houver novos registros.</div>}</div></section>
      <section className="admin-panel chart-panel"><div className="panel-heading"><div><span className="eyebrow">COMPOSIÇÃO DO PORTFÓLIO</span><h3>Imóveis por finalidade</h3></div><span className="panel-icon"><CircleDollarSign size={17} /></span></div><div className="purpose-chart-wrap">{data.propertiesByPurpose.length ? <><div className="purpose-pie"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.propertiesByPurpose} dataKey="value" nameKey="name" innerRadius={55} outerRadius={78} paddingAngle={4} stroke="none">{data.propertiesByPurpose.map((entry, i) => <Cell key={entry.name} fill={chartColors[i % chartColors.length]} />)}</Pie><Tooltip formatter={(value, name) => [value, purposeLabels(String(name))]} /></PieChart></ResponsiveContainer></div><div className="purpose-legend">{data.propertiesByPurpose.map((item, i) => <div key={item.name}><span style={{ backgroundColor: chartColors[i % chartColors.length] }} /><span>{purposeLabels(item.name)}</span><strong>{item.value}</strong></div>)}</div></> : <div className="chart-empty">Sem dados de finalidade para exibir.</div>}</div></section>
    </div>
    <div className="dashboard-bottom-grid">
      <section className="admin-panel city-panel"><div className="panel-heading"><div><span className="eyebrow">ONDE ESTÃO OS IMÓVEIS</span><h3>Distribuição por cidade</h3></div><Link to="/admin/properties" className="panel-link">Ver catálogo <ArrowRight size={14} /></Link></div>{data.propertiesByCity.length ? <div className="city-bars">{data.propertiesByCity.map((item, index) => <div className="city-bar-row" key={item.name}><span>{item.name || 'Não informada'}</span><div><span style={{ width: `${Math.max(8, item.value / Math.max(...data.propertiesByCity.map((city) => city.value)) * 100)}%`, background: chartColors[index % chartColors.length] }} /></div><strong>{item.value}</strong></div>)}</div> : <div className="chart-empty">As cidades aparecerão após o cadastro dos imóveis.</div>}</section>
      <section className="admin-panel activity-panel"><div className="panel-heading"><div><span className="eyebrow">ACOMPANHAMENTO</span><h3>Atividade recente</h3></div><Activity size={17} className="activity-icon" /></div>{data.recentActivity.length ? <div className="activity-list">{data.recentActivity.slice(0, 6).map((item, index) => <div className="activity-item" key={String(item.id || index)}><span className="activity-dot" /><div><strong>{actionNames[String(item.action)] || String(item.kind === 'lead' ? 'Novo lead recebido' : item.action || 'Atividade registrada')}</strong><p>{String(item.details || item.name || 'Ação registrada no sistema')}</p><small>{item.user_name ? `${String(item.user_name)} · ` : ''}{formatDate(String(item.created_at || ''), true)}</small></div></div>)}</div> : <div className="activity-empty"><Activity size={19} /><span>As ações relevantes aparecerão aqui.</span></div>}<Link to="/admin/audit" className="activity-all">Ver registro de auditoria <ArrowRight size={14} /></Link></section>
    </div>
  </div>;
}
