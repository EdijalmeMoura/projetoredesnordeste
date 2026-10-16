import { useState } from 'react';
import { Link } from 'react-router-dom';

const legacyLogo = 'https://projetoredesnordeste.com.br/wp-content/uploads/2025/11/logo-verde-redes.png';

export default function Brand({ inverse = false, compact = false, logoUrl }: { inverse?: boolean; compact?: boolean; logoUrl?: string }) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageSource = !compact && !imageFailed ? (logoUrl || legacyLogo) : '';
  return (
    <Link className={`brand ${inverse ? 'brand-inverse' : ''} ${compact ? 'brand-compact' : ''}`} to="/" aria-label="Projeto Redes Nordeste — início">
      {imageSource ? <img className="brand-logo-image" src={imageSource} alt="" onError={() => setImageFailed(true)} /> : <>
        <span className="brand-symbol"><span className="brand-monogram">R</span><span className="brand-accent" /></span>
        <span className="brand-copy"><strong>REDES NORDESTE</strong><small>TURISMO · IMÓVEIS</small></span>
      </>}
    </Link>
  );
}
