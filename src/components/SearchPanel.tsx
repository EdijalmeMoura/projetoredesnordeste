import { useState, type FormEvent } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SearchValues { type: string; city: string; neighborhood: string; minPrice: string; maxPrice: string; bedrooms: string; }
const emptyValues: SearchValues = { type: 'all', city: '', neighborhood: '', minPrice: '', maxPrice: '', bedrooms: '' };

export default function SearchPanel({ initialPurpose = 'sale', compact = false }: { initialPurpose?: 'sale' | 'rent'; compact?: boolean }) {
  const navigate = useNavigate();
  const [purpose, setPurpose] = useState<'sale' | 'rent'>(initialPurpose);
  const [values, setValues] = useState<SearchValues>(emptyValues);
  const set = (field: keyof SearchValues, value: string) => setValues((current) => ({ ...current, [field]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams({ purpose });
    Object.entries(values).forEach(([key, value]) => { if (value && value !== 'all') params.set(key, value); });
    navigate(`/imoveis?${params.toString()}`);
  };
  return (
    <form className={`search-panel ${compact ? 'search-panel-compact' : ''}`} onSubmit={submit}>
      <div className="search-panel-top">
        <div className="search-tabs" role="tablist" aria-label="Finalidade do imóvel">
          <button type="button" role="tab" aria-selected={purpose === 'sale'} className={purpose === 'sale' ? 'selected' : ''} onClick={() => setPurpose('sale')}>Comprar</button>
          <button type="button" role="tab" aria-selected={purpose === 'rent'} className={purpose === 'rent' ? 'selected' : ''} onClick={() => setPurpose('rent')}>Alugar</button>
        </div>
        <span className="search-panel-hint"><SlidersHorizontal size={14} /> Encontre do seu jeito</span>
      </div>
      <div className="search-fields">
        <label className="search-field"><span>Tipo de imóvel</span><select value={values.type} onChange={(e) => set('type', e.target.value)}><option value="all">Todos os tipos</option><option value="house">Casa</option><option value="apartment">Apartamento</option><option value="penthouse">Cobertura</option><option value="duplex">Duplex</option><option value="land">Terreno</option><option value="studio">Studio</option><option value="other">Outro</option></select></label>
        <label className="search-field"><span>Cidade</span><input value={values.city} onChange={(e) => set('city', e.target.value)} placeholder="Ex.: Recife" /></label>
        <label className="search-field"><span>Bairro</span><input value={values.neighborhood} onChange={(e) => set('neighborhood', e.target.value)} placeholder="Qualquer bairro" /></label>
        <label className="search-field"><span>Preço mínimo</span><input type="number" min="0" value={values.minPrice} onChange={(e) => set('minPrice', e.target.value)} placeholder="R$ mínimo" /></label>
        <label className="search-field"><span>Preço máximo</span><input type="number" min="0" value={values.maxPrice} onChange={(e) => set('maxPrice', e.target.value)} placeholder="R$ máximo" /></label>
        <label className="search-field search-bedrooms"><span>Quartos</span><select value={values.bedrooms} onChange={(e) => set('bedrooms', e.target.value)}><option value="">Qualquer</option><option value="1">1+</option><option value="2">2+</option><option value="3">3+</option><option value="4">4+</option></select></label>
        <button className="button button-primary search-submit" type="submit"><Search size={18} /> Buscar imóveis</button>
      </div>
    </form>
  );
}
