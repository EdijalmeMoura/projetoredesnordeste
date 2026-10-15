import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowDownWideNarrow, Grid2X2, List, LoaderCircle, MapPin, SlidersHorizontal, X } from 'lucide-react';
import PropertyCard from '../components/PropertyCard';
import { api } from '../lib/api';
import type { Property } from '../types';
import { setPageMeta } from '../lib/seo';

interface Filters { purpose: string; type: string; city: string; neighborhood: string; minPrice: string; maxPrice: string; bedrooms: string; bathrooms: string; parking: string; minArea: string; }
const filterKeys: (keyof Filters)[] = ['purpose', 'type', 'city', 'neighborhood', 'minPrice', 'maxPrice', 'bedrooms', 'bathrooms', 'parking', 'minArea'];
const defaultFilters: Filters = { purpose: '', type: '', city: '', neighborhood: '', minPrice: '', maxPrice: '', bedrooms: '', bathrooms: '', parking: '', minArea: '' };

function FiltersForm({ filters, setFilters, onSubmit, onClear }: { filters: Filters; setFilters: (filters: Filters) => void; onSubmit: (event: FormEvent) => void; onClear: () => void }) {
  const update = (key: keyof Filters, value: string) => setFilters({ ...filters, [key]: value });
  return <form onSubmit={onSubmit} className="filters-form">
    <label className="form-field"><span>Finalidade</span><select value={filters.purpose} onChange={(e) => update('purpose', e.target.value)}><option value="">Comprar ou alugar</option><option value="sale">Comprar</option><option value="rent">Alugar</option></select></label>
    <label className="form-field"><span>Tipo do imóvel</span><select value={filters.type} onChange={(e) => update('type', e.target.value)}><option value="">Todos os tipos</option><option value="house">Casa</option><option value="apartment">Apartamento</option><option value="penthouse">Cobertura</option><option value="duplex">Duplex</option><option value="land">Terreno</option><option value="studio">Studio</option><option value="other">Outro</option></select></label>
    <label className="form-field"><span>Cidade</span><input value={filters.city} onChange={(e) => update('city', e.target.value)} placeholder="Ex.: Recife" /></label>
    <label className="form-field"><span>Bairro</span><input value={filters.neighborhood} onChange={(e) => update('neighborhood', e.target.value)} placeholder="Qualquer bairro" /></label>
    <div className="filters-price-row"><label className="form-field"><span>Preço mínimo</span><input type="number" min="0" value={filters.minPrice} onChange={(e) => update('minPrice', e.target.value)} placeholder="R$ mínimo" /></label><label className="form-field"><span>Preço máximo</span><input type="number" min="0" value={filters.maxPrice} onChange={(e) => update('maxPrice', e.target.value)} placeholder="R$ máximo" /></label></div>
    <label className="form-field"><span>Quartos a partir de</span><select value={filters.bedrooms} onChange={(e) => update('bedrooms', e.target.value)}><option value="">Qualquer quantidade</option><option value="1">1+ quartos</option><option value="2">2+ quartos</option><option value="3">3+ quartos</option><option value="4">4+ quartos</option></select></label>
    <div className="filters-price-row"><label className="form-field"><span>Banheiros</span><select value={filters.bathrooms} onChange={(e) => update('bathrooms', e.target.value)}><option value="">Qualquer</option><option value="1">1+</option><option value="2">2+</option><option value="3">3+</option></select></label><label className="form-field"><span>Vagas</span><select value={filters.parking} onChange={(e) => update('parking', e.target.value)}><option value="">Qualquer</option><option value="1">1+</option><option value="2">2+</option><option value="3">3+</option></select></label></div>
    <label className="form-field"><span>Área mínima (m²)</span><input type="number" min="0" value={filters.minArea} onChange={(e) => update('minArea', e.target.value)} placeholder="Ex.: 80" /></label>
    <div className="filter-actions"><button className="button button-primary button-full" type="submit">Aplicar filtros</button><button type="button" className="filter-clear" onClick={onClear}>Limpar filtros</button></div>
  </form>;
}

export default function PropertiesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<Filters>(() => ({ ...defaultFilters, ...Object.fromEntries(filterKeys.map((key) => [key, searchParams.get(key) || ''])) } as Filters));
  const [properties, setProperties] = useState<Property[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [sort, setSort] = useState(searchParams.get('sort') || 'relevance');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState('');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const requestParams = useMemo(() => searchParams.toString(), [searchParams]);
  useEffect(() => {
    const pageTitle = filters.purpose === 'rent' ? 'Imóveis para alugar' : filters.purpose === 'sale' ? 'Imóveis para comprar' : 'Imóveis';
    setPageMeta(`${pageTitle} | Projeto Redes Nordeste`, 'Explore imóveis residenciais para comprar ou alugar no Nordeste. Use filtros por cidade, bairro, preço, tipo e características.');
  }, [filters.purpose]);
  useEffect(() => {
    const query = new URLSearchParams(requestParams);
    const nextFilters = { ...defaultFilters };
    filterKeys.forEach((key) => { nextFilters[key] = query.get(key) || ''; });
    setFilters(nextFilters); setSort(query.get('sort') || 'relevance');
    window.sessionStorage.setItem('prn:lastSearch', `/imoveis${requestParams ? `?${requestParams}` : ''}`);
  }, [requestParams]);
  useEffect(() => {
    setLoading(true); setError('');
    const query = new URLSearchParams(requestParams);
    if (!query.has('limit')) query.set('limit', '9');
    api<{ properties: Property[]; total: number; pages: number; page: number }>(`/api/public/properties?${query.toString()}`)
      .then((result) => { setProperties(result.properties); setTotal(result.total); setPages(result.pages); setPage(result.page); })
      .catch((issue) => setError(issue.message || 'Não foi possível carregar os imóveis.'))
      .finally(() => setLoading(false));
  }, [requestParams, retry]);

  const submitFilters = (event: FormEvent) => {
    event.preventDefault();
    const next = new URLSearchParams();
    filterKeys.forEach((key) => { if (filters[key]) next.set(key, filters[key]); });
    next.set('page', '1'); next.set('sort', sort); next.set('limit', '9');
    setSearchParams(next); setMobileFiltersOpen(false);
  };
  const clearFilters = () => {
    setFilters(defaultFilters); setSort('relevance'); setSearchParams({ page: '1', sort: 'relevance', limit: '9' }); setMobileFiltersOpen(false);
  };
  const changePage = (nextPage: number) => {
    const next = new URLSearchParams(searchParams); next.set('page', String(nextPage)); setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const activeCount = filterKeys.filter((key) => filters[key]).length;
  const title = filters.purpose === 'rent' ? 'Imóveis para alugar' : filters.purpose === 'sale' ? 'Imóveis para comprar' : 'Encontre seu próximo lugar';

  return <div className="listing-page">
    <section className="listing-banner"><div className="container"><div className="breadcrumbs"><Link to="/">Início</Link><span>/</span><span>Imóveis</span></div><div className="listing-banner-content"><div><span className="eyebrow eyebrow-light">CATÁLOGO DE IMÓVEIS</span><h1>{title}</h1><p>Um bom começo para encontrar o espaço que combina com a sua vida.</p></div><div className="listing-banner-icon"><MapPin size={30} /></div></div></div></section>
    <section className="container results-layout">
      <aside className="filters-sidebar"><div className="filters-title"><div><SlidersHorizontal size={18} /><h2>Filtros</h2></div>{activeCount > 0 && <span>{activeCount}</span>}</div><FiltersForm filters={filters} setFilters={setFilters} onSubmit={submitFilters} onClear={clearFilters} /></aside>
      <div className="results-main">
        <div className="results-toolbar"><div><h2>{loading ? 'Buscando imóveis…' : `${total} ${total === 1 ? 'imóvel encontrado' : 'imóveis encontrados'}`}</h2><p>{filters.city || filters.neighborhood ? [filters.neighborhood, filters.city].filter(Boolean).join(', ') : 'Explore imóveis em destaque e novas possibilidades.'}</p></div><div className="results-tools"><button className="mobile-filter-trigger" onClick={() => setMobileFiltersOpen(true)}><SlidersHorizontal size={16} /> Filtros {activeCount > 0 && <small>{activeCount}</small>}</button><label className="sort-select"><ArrowDownWideNarrow size={16} /><select aria-label="Ordenar imóveis" value={sort} onChange={(e) => { setSort(e.target.value); const next = new URLSearchParams(searchParams); next.set('sort', e.target.value); next.set('page', '1'); setSearchParams(next); }}><option value="relevance">Relevância</option><option value="recent">Mais recentes</option><option value="price-asc">Menor preço</option><option value="price-desc">Maior preço</option></select></label><div className="view-switch" aria-label="Modo de visualização"><button className={view === 'grid' ? 'active' : ''} aria-label="Visualizar em grade" onClick={() => setView('grid')}><Grid2X2 size={17} /></button><button className={view === 'list' ? 'active' : ''} aria-label="Visualizar em lista" onClick={() => setView('list')}><List size={18} /></button></div></div></div>
        {error ? <div className="error-state"><p>{error}</p><button className="button button-outline" onClick={() => setRetry((value) => value + 1)}>Tentar novamente</button></div> : loading ? <div className={`property-grid results-grid results-${view}`}>{[1, 2, 3].map((i) => <div className="property-skeleton" key={i} />)}</div> : properties.length ? <><div className={`property-grid results-grid results-${view}`}>{properties.map((property) => <PropertyCard key={property.id} property={property} variant={view} />)}</div><div className="pagination"><span>Mostrando {(page - 1) * 9 + 1}–{Math.min(page * 9, total)} de {total}</span><div><button disabled={page <= 1} onClick={() => changePage(page - 1)}>Anterior</button><span className="page-current">{page} <small>de</small> {pages}</span><button disabled={page >= pages} onClick={() => changePage(page + 1)}>Próxima</button></div></div></> : <div className="empty-results"><div className="empty-illustration"><Grid2X2 size={28} /></div><h2>Nenhum imóvel por aqui, ainda.</h2><p>Tente ajustar os filtros ou explore todas as opções disponíveis.</p><button className="button button-primary" onClick={clearFilters}>Limpar filtros</button></div>}
      </div>
    </section>
    {mobileFiltersOpen && <div className="mobile-filter-overlay" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) setMobileFiltersOpen(false); }}><div className="mobile-filter-sheet"><div className="mobile-sheet-head"><div><span className="eyebrow">REFINE SUA BUSCA</span><h2>Filtros <small>{activeCount ? `(${activeCount})` : ''}</small></h2></div><button aria-label="Fechar filtros" onClick={() => setMobileFiltersOpen(false)}><X size={20} /></button></div><FiltersForm filters={filters} setFilters={setFilters} onSubmit={submitFilters} onClear={clearFilters} /></div></div>}
  </div>;
}
