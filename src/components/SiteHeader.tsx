import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import Brand from './Brand';
import type { SiteSettings } from '../types';

const links = [
  { to: '/imoveis?purpose=sale', label: 'Comprar', purpose: 'sale' },
  { to: '/imoveis?purpose=rent', label: 'Alugar', purpose: 'rent' },
  { to: '/sobre', label: 'Sobre a REDES' },
];

export default function SiteHeader({ settings }: { settings: SiteSettings }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const purpose = new URLSearchParams(location.search).get('purpose');
  return (
    <header className="site-header">
      <div className="site-header-inner container">
        <Brand logoUrl={settings.logoUrl} />
        <nav className={`main-nav ${open ? 'nav-open' : ''}`} aria-label="Navegação principal">
          {links.map((link) => <NavLink key={link.label} to={link.to} onClick={() => setOpen(false)} className={({ isActive }) => `${isActive && (!link.purpose || purpose === link.purpose) ? 'active' : ''}`}>{link.label}</NavLink>)}
          <Link to="/contato" className="mobile-nav-contact" onClick={() => setOpen(false)}>Fale com a equipe</Link>
        </nav>
        <div className="header-actions">
          {settings.phone && <a className="header-phone" href={`tel:${settings.phone.replace(/\D/g, '')}`}>{settings.phone}</a>}
          <Link to="/anuncie" className="button button-primary button-small header-announce">Anuncie seu imóvel <ArrowUpRight size={15} /></Link>
        </div>
        <button type="button" aria-label={open ? 'Fechar menu' : 'Abrir menu'} className="menu-toggle" onClick={() => setOpen(!open)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
    </header>
  );
}
