import { ArrowUpRight, Instagram, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import Brand from './Brand';
import type { SiteSettings } from '../types';

export default function SiteFooter({ settings }: { settings: SiteSettings }) {
  return (
    <footer className="site-footer">
      <div className="container footer-main">
        <div className="footer-brand-block">
          <Brand inverse logoUrl={settings.logoUrl} />
          <p>Um lugar para chamar de seu muda tudo.<br />A gente ajuda você a encontrar o próximo.</p>
          {settings.instagram && <a className="social-link" href={settings.instagram} target="_blank" rel="noreferrer"><Instagram size={17} /> Instagram <ArrowUpRight size={14} /></a>}
        </div>
        <div className="footer-column"><h3>Explore</h3><Link to="/imoveis">Todos os imóveis</Link><Link to="/imoveis?purpose=sale">Comprar</Link><Link to="/imoveis?purpose=rent">Alugar</Link><Link to="/anuncie">Anuncie seu imóvel</Link></div>
        <div className="footer-column"><h3>Institucional</h3><Link to="/sobre">Sobre nós</Link><Link to="/contato">Contato</Link><Link to="/privacidade">Privacidade</Link><Link to="/termos">Termos de uso</Link></div>
        <div className="footer-column footer-contact"><h3>Vamos conversar?</h3><p>Conte o que você procura. Nossa equipe está aqui para ajudar.</p>
          {settings.phone && <a href={`tel:${settings.phone.replace(/\D/g, '')}`}><Phone size={15} /> {settings.phone}</a>}
          {settings.email && <a href={`mailto:${settings.email}`}><Mail size={15} /> {settings.email}</a>}
          {settings.whatsapp && <a href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp comercial</a>}
          <Link to="/contato" className="footer-contact-link"><MapPin size={15} /> Fale com um consultor <ArrowUpRight size={14} /></Link>
        </div>
      </div>
      <div className="container footer-bottom"><span>© {new Date().getFullYear()} {settings.businessName || 'Projeto Redes Nordeste'}. Todos os direitos reservados.</span><span>Feito para encontrar novos começos.</span><Link to="/admin">Área da equipe</Link></div>
    </footer>
  );
}
