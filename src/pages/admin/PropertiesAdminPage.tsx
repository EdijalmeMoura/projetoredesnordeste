import { useEffect, useMemo, useState } from 'react';
import { Archive, ArrowDown, ArrowUpRight, Building2, Copy, Edit3, Eye, Filter, Plus, Search, Star, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { availabilityLabel, currency, formatDate, publicationLabel, propertyTypeLabel, purposeLabel } from '../../lib/format';
import { useToast } from '../../context/ToastContext';
import type { Property } from '../../types';
import { useAuth } from '../../context/AuthContext';

export default function PropertiesAdminPage() {
  const { user } = useAuth();
  const canManage = user?.role === 'administrator' || user?.role === 'manager';
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [purpose, setPurpose] = useState(searchParams.get('purpose') || '');
  const [pubStatus, setPubStatus] = useState(searchParams.get('publication_status') || '');
  const [availability, setAvailability] = useState(searchParams.get('availability_status') || '');
  const [error, setError] = useState('');
  const { notify } = useToast();
  const query = useMemo(() => searchParams.toString(), [searchParams]);
  useEffect(() => {
    setSearch(searchParams.get('search') || '');
    setPurpose(searchParams.get('purpose') || '');
    setPubStatus(searchParams.get('publication_status') || '');
    setAvailability(searchParams.get('availability_status') || '');
  }, [query]);
  const load = () => {
    setLoading(true); setError('');
    api<{ properties: Property[] }>(`/api/admin/properties?${query}`).then((result) => setProperties(result.properties)).catch((issue) => setError(issue.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [query]);
  const applyFilters = (event: React.FormEvent) => {
    event.preventDefault(); const next = new URLSearchParams();
    if (search.trim()) next.set('search', search.trim()); if (purpose) next.set('purpose', purpose); if (pubStatus) next.set('publication_status', pubStatus); if (availability) next.set('availability_status', availability);
    setSearchParams(next);
  };
  const clear = () => { setSearch(''); setPurpose(''); setPubStatus(''); setAvailability(''); setSearchParams({}); };
  const archive = async (property: Property) => {
    if (!window.confirm(`Arquivar ${property.code}? O histórico será preservado.`)) return;
    try { await api(`/api/admin/properties/${property.id}/archive`, { method: 'POST' }); notify('Imóvel arquivado.'); load(); } catch (issue) { notify((issue as Error).message, 'error'); }
  };
  const publish = async (property: Property) => {
    try { await api(`/api/admin/properties/${property.id}/publish`, { method: 'POST' }); notify('Imóvel publicado no catálogo.'); load(); } catch (issue) { notify((issue as Error).message, 'error'); }
  };
  const feature = async (property: Property) => {
    try { await api(`/api/admin/properties/${property.id}/feature`, { method: 'POST', body: { is_featured: !property.is_featured } }); notify(property.is_featured ? 'Destaque removido.' : 'Imóvel marcado como destaque.'); load(); } catch (issue) { notify((issue as Error).message, 'error'); }
  };
  const duplicate = async (property: Property) => {
    try {
      const detail = await api<{ property: Property }>(`/api/admin/properties/${property.id}`);
      const { id, code, slug, created_at, updated_at, published_at, owner_name, agent_name, ...copy } = detail.property;
      await api('/api/admin/properties', { method: 'POST', body: { ...copy, title: `${copy.title} — cópia`, publication_status: 'draft', is_featured: false, is_demo: Boolean(copy.is_demo), approved: false } });
      notify('Rascunho duplicado com um novo código.'); load();
    } catch (issue) { notify((issue as Error).message, 'error'); }
  };
  const activeFilters = [searchParams.get('search'), searchParams.get('purpose'), searchParams.get('publication_status'), searchParams.get('availability_status')].filter(Boolean).length;
  return <div className="admin-page properties-admin-page">
    <div className="admin-page-heading"><div><span className="eyebrow">PORTFÓLIO</span><h2>Imóveis</h2><p>Acompanhe anúncios, disponibilidade e publicação.</p></div><Link to="/admin/properties/new" className="button button-primary"><Plus size={17} /> Cadastrar imóvel</Link></div>
    <form className="admin-filter-bar" onSubmit={applyFilters}><div className="admin-search-field"><Search size={17} /><input placeholder="Buscar por código, título ou localização" value={search} onChange={(e) => setSearch(e.target.value)} /></div><label><span>Finalidade</span><select value={purpose} onChange={(e) => setPurpose(e.target.value)}><option value="">Todas</option><option value="sale">Venda</option><option value="rent">Aluguel</option><option value="both">Ambas</option></select></label><label><span>Publicação</span><select value={pubStatus} onChange={(e) => setPubStatus(e.target.value)}><option value="">Todos</option><option value="draft">Rascunho</option><option value="pending_review">Em aprovação</option><option value="published">Publicado</option><option value="archived">Arquivado</option></select></label><label><span>Disponibilidade</span><select value={availability} onChange={(e) => setAvailability(e.target.value)}><option value="">Todas</option><option value="available">Disponível</option><option value="reserved">Reservado</option><option value="negotiation">Em negociação</option><option value="sold">Vendido</option><option value="rented">Alugado</option></select></label><button type="submit" className="button button-outline filter-apply"><Filter size={15} /> Filtrar</button>{activeFilters > 0 && <button type="button" onClick={clear} className="clear-filter-button"><X size={15} /> Limpar</button>}</form>
    <div className="admin-table-wrap"><table className="admin-table property-table"><thead><tr><th>Imóvel</th><th>Localização</th><th>Finalidade</th><th>Preço</th><th>Atualização</th><th>Status</th><th className="actions-col">Ações</th></tr></thead><tbody>{loading ? Array.from({ length: 4 }, (_, i) => <tr key={i}><td colSpan={7}><div className="table-skeleton" /></td></tr>) : error ? <tr><td colSpan={7}><div className="table-empty">{error}</div></td></tr> : properties.length ? properties.map((property) => {
      const cover = property.images?.find((image) => image.is_cover) || property.images?.[0];
      const price = property.purpose === 'rent' ? property.rent_price : property.sale_price;
      return <tr key={property.id}>
        <td><div className="property-table-main"><img src={cover?.url || '/assets/property-house.jpg'} alt="" /><div><strong>{property.title}</strong><span>{property.code} · {propertyTypeLabel(property.type)}{property.is_demo ? <em className="table-demo-label">Exemplo</em> : null}</span></div></div></td>
        <td><strong className="table-location">{property.city || '—'}</strong><span className="table-sub">{property.neighborhood || 'Bairro não informado'}</span></td>
        <td><span className={`mini-purpose ${property.purpose === 'rent' ? 'rent' : ''}`}>{purposeLabel(property.purpose)}</span></td>
        <td><strong className="table-price">{currency(price)}</strong><span className="table-sub">{property.purpose === 'rent' ? '/ mês' : ''}</span></td>
        <td><span className="table-sub">{formatDate(property.updated_at || property.created_at)}</span></td>
        <td><div className="table-status-stack"><span className={`status-pill status-${property.publication_status}`}>{publicationLabel(property.publication_status)}</span><span className={`availability-dot availability-${property.availability_status}`}>{availabilityLabel(property.availability_status)}</span></div></td>
        <td><div className="table-actions">{!(property.publication_status === 'published' && user?.role === 'editor') && <Link to={`/admin/properties/${property.id}/edit`} title="Editar imóvel" aria-label="Editar imóvel"><Edit3 size={16} /></Link>}{property.publication_status === 'published' && <Link to={`/imovel/${property.slug}`} title="Ver anúncio público" target="_blank"><Eye size={16} /></Link>}{canManage && property.publication_status !== 'published' && <button title="Publicar" aria-label="Publicar" onClick={() => publish(property)}><ArrowUpRight size={16} /></button>}{canManage && <button title={property.is_featured ? 'Remover destaque' : 'Marcar destaque'} onClick={() => feature(property)} className={property.is_featured ? 'action-featured' : ''}><Star size={16} fill={property.is_featured ? 'currentColor' : 'none'} /></button>}<button title="Duplicar rascunho" onClick={() => duplicate(property)}><Copy size={16} /></button>{canManage && property.publication_status !== 'archived' && <button title="Arquivar" onClick={() => archive(property)}><Archive size={16} /></button>}</div></td>
      </tr>;
    }) : <tr><td colSpan={7}><div className="table-empty"><Building2Icon /><strong>Nenhum imóvel encontrado</strong><span>Cadastre um imóvel ou ajuste os filtros.</span><Link to="/admin/properties/new" className="button button-primary button-small"><Plus size={15} /> Cadastrar imóvel</Link></div></td></tr>}</tbody></table></div>
    <div className="table-footnote"><span><ArrowDown size={14} /> A listagem exibe até 250 registros mais recentes.</span><span>{properties.length} {properties.length === 1 ? 'imóvel' : 'imóveis'} nesta visualização</span></div>
  </div>;
}
function Building2Icon() { return <Building2 size={23} />; }
