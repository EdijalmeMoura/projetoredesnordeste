import { useState } from 'react';
import { ArrowUpRight, BedDouble, Heart, Maximize2, ShowerHead, Warehouse } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Property } from '../types';
import { currency, propertyTypeLabel, purposeLabel } from '../lib/format';

export default function PropertyCard({ property, variant = 'grid' }: { property: Property; variant?: 'grid' | 'list' }) {
  const [saved, setSaved] = useState(() => {
    try { return JSON.parse(localStorage.getItem('prn:favorites') || '[]').includes(property.id); } catch { return false; }
  });
  const cover = property.images?.find((image) => image.is_cover) || property.images?.[0];
  const price = property.purpose === 'rent' ? property.rent_price : property.sale_price;
  const toggleFavorite = (event: React.MouseEvent) => {
    event.preventDefault(); event.stopPropagation();
    const current: number[] = (() => { try { return JSON.parse(localStorage.getItem('prn:favorites') || '[]'); } catch { return []; } })();
    const next = saved ? current.filter((id) => id !== property.id) : [...current, property.id];
    localStorage.setItem('prn:favorites', JSON.stringify(next));
    setSaved(!saved);
  };
  return (
    <article className={`property-card property-card-${variant}`}>
      <Link to={`/imovel/${property.slug}`} className="property-card-link" aria-label={`Ver imóvel ${property.title}`}>
        <div className="property-image-wrap">
          <img src={cover?.url || '/assets/property-house.jpg'} alt={cover?.caption || property.title} loading="lazy" />
          <div className="property-badges"><span className={`badge-purpose ${property.purpose === 'rent' ? 'badge-rent' : ''}`}>{purposeLabel(property.purpose)}</span>{property.is_featured ? <span className="badge-featured">Destaque</span> : null}{property.is_demo ? <span className="badge-demo">Exemplo</span> : null}</div>
          <button type="button" className={`favorite-button ${saved ? 'is-saved' : ''}`} aria-label={saved ? 'Remover dos favoritos' : 'Adicionar aos favoritos'} onClick={toggleFavorite}><Heart size={18} fill={saved ? 'currentColor' : 'none'} /></button>
          {variant === 'list' && <span className="property-type-chip">{propertyTypeLabel(property.type)}</span>}
        </div>
        <div className="property-card-content">
          <div className="property-card-kicker"><span>{propertyTypeLabel(property.type)}</span><span className="property-code">{property.code}</span></div>
          <h3>{property.title}</h3>
          <p className="property-location">{property.neighborhood ? `${property.neighborhood}, ` : ''}{property.city} — {property.state}</p>
          <div className="property-price-line"><strong>{currency(price)}</strong><span>{property.purpose === 'rent' ? '/ mês' : property.purpose === 'both' ? 'a partir de' : ''}</span></div>
          <div className="property-meta">
            {property.bedrooms > 0 && <span><BedDouble size={16} /> {property.bedrooms} quartos</span>}
            {property.bathrooms > 0 && <span><ShowerHead size={16} /> {property.bathrooms} banh.</span>}
            {property.parking > 0 && <span><Warehouse size={16} /> {property.parking} vagas</span>}
            {property.area_built && <span><Maximize2 size={15} /> {property.area_built} m²</span>}
          </div>
          <div className="property-card-cta"><span>Ver imóvel</span><ArrowUpRight size={17} /></div>
        </div>
      </Link>
    </article>
  );
}
