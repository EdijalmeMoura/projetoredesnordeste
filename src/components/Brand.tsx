import { Link } from 'react-router-dom';

export default function Brand({ inverse = false, compact = false }: { inverse?: boolean; compact?: boolean }) {
  return (
    <Link className={`brand ${inverse ? 'brand-inverse' : ''} ${compact ? 'brand-compact' : ''}`} to="/" aria-label="Projeto Redes Nordeste — início">
      <span className="brand-symbol"><span className="brand-monogram">R</span><span className="brand-accent" /></span>
      <span className="brand-copy"><strong>REDES NORDESTE</strong><small>TURISMO · IMÓVEIS</small></span>
    </Link>
  );
}
