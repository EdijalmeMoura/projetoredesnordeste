import { House } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Brand({ inverse = false, compact = false }: { inverse?: boolean; compact?: boolean }) {
  return (
    <Link className={`brand ${inverse ? 'brand-inverse' : ''} ${compact ? 'brand-compact' : ''}`} to="/" aria-label="Projeto Redes Nordeste — início">
      <span className="brand-symbol"><House size={22} strokeWidth={2.1} /><span /></span>
      <span className="brand-copy"><strong>REDES NORDESTE</strong><small>IMÓVEIS COM PROPÓSITO</small></span>
    </Link>
  );
}
