import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BedDouble, Check, ChevronLeft, ChevronRight, Heart, MapPin, Maximize2, Share2, ShieldCheck, ShowerHead, Warehouse, X } from 'lucide-react';
import PropertyCard from '../components/PropertyCard';
import { api } from '../lib/api';
import { currency, propertyTypeLabel, purposeLabel } from '../lib/format';
import type { Property, SiteSettings } from '../types';
import { setPageMeta } from '../lib/seo';
import { useToast } from '../context/ToastContext';

export default function PropertyDetailPage() {
  const { slug = '' } = useParams();
  const [property, setProperty] = useState<Property | null>(null);
  const [similar, setSimilar] = useState<Property[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeImage, setActiveImage] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState('');
  const { notify } = useToast();

  useEffect(() => {
    setLoading(true); setError(''); setActiveImage(0); setSent(false);
    api<Property>(`/api/public/properties/${encodeURIComponent(slug)}`)
      .then((item) => {
        setProperty(item);
        const favs: number[] = (() => { try { return JSON.parse(localStorage.getItem('prn:favorites') || '[]'); } catch { return []; } })();
        setSaved(favs.includes(item.id));
        const params = new URLSearchParams({ city: item.city, limit: '4', sort: 'relevance' });
        api<{ properties: Property[] }>(`/api/public/properties?${params}`).then((result) => setSimilar(result.properties.filter((candidate) => candidate.id !== item.id).slice(0, 3))).catch(() => setSimilar([]));
      })
      .catch((issue) => setError(issue.message || 'Não foi possível encontrar este imóvel.'))
      .finally(() => setLoading(false));
    api<SiteSettings>('/api/public/settings').then(setSettings).catch(() => undefined);
  }, [slug]);

  useEffect(() => {
    if (!property) return;
    const title = `${property.title} · ${property.code} | Projeto Redes Nordeste`;
    const description = `${propertyTypeLabel(property.type)} para ${purposeLabel(property.purpose).toLowerCase()} em ${property.neighborhood ? `${property.neighborhood}, ` : ''}${property.city}. ${property.bedrooms} quartos · ${property.area_built || '—'} m².`;
    setPageMeta(title, description, property.images?.[0]?.url);
    const image = property.images?.[0]?.url;
    const script = document.createElement('script'); script.type = 'application/ld+json';
    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org', '@type': 'RealEstateListing', name: property.title, description, url: window.location.href,
      image: image ? (image.startsWith('http') ? image : `${window.location.origin}${image}`) : undefined,
      address: { '@type': 'PostalAddress', addressLocality: property.city, addressRegion: property.state, addressCountry: 'BR', ...(property.show_exact_address ? { streetAddress: [property.street, property.number, property.complement].filter(Boolean).join(', ') } : {}) },
      floorSize: property.area_built ? { '@type': 'QuantitativeValue', value: property.area_built, unitCode: 'MTK' } : undefined,
    };
    if (!property.is_demo) schema.offers = { '@type': 'Offer', priceCurrency: 'BRL', price: property.purpose === 'rent' ? property.rent_price : property.sale_price, availability: property.availability_status === 'available' ? 'https://schema.org/InStock' : 'https://schema.org/LimitedAvailability' };
    script.textContent = JSON.stringify(schema); document.head.append(script);
    return () => script.remove();
  }, [property]);
  const images = useMemo(() => property?.images?.length ? property.images : [{ url: '/assets/property-house.jpg', caption: property?.title || 'Imóvel' }], [property]);
  const mainImage = images[activeImage] || images[0];
  const price = property?.purpose === 'rent' ? property.rent_price : property?.sale_price;
  const toggleSaved = () => {
    if (!property) return;
    const favs: number[] = (() => { try { return JSON.parse(localStorage.getItem('prn:favorites') || '[]'); } catch { return []; } })();
    const next = saved ? favs.filter((id) => id !== property.id) : [...favs, property.id];
    localStorage.setItem('prn:favorites', JSON.stringify(next)); setSaved(!saved);
  };
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: property?.title || 'Imóvel', url });
      else { await navigator.clipboard.writeText(url); notify('Link do imóvel copiado.'); }
    } catch { /* Compartilhamento cancelado pelo usuário. */ }
  };
  const sendLead = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSending(true); setFormError('');
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await api('/api/public/leads', { method: 'POST', body: {
        name: form.get('name'), phone: form.get('phone'), email: form.get('email'), message: form.get('message'),
        purpose: property?.purpose, propertyId: property?.id, consent: form.get('consent') === 'on',
      } });
      setSent(true); formElement.reset();
    } catch (issue) { setFormError((issue as Error).message); }
    finally { setSending(false); }
  };
  const setImage = (delta: number) => setActiveImage((current) => (current + delta + images.length) % images.length);
  const waNumber = (settings.whatsapp || '').replace(/\D/g, '');
  const waMessage = encodeURIComponent(`Olá! Tenho interesse no imóvel ${property?.code || ''} — ${property?.title || ''}. Gostaria de receber mais informações.`);
  const returnTo = window.sessionStorage.getItem('prn:lastSearch') || '/imoveis';

  if (loading) return <div className="detail-loading container"><div className="detail-skeleton" /><div className="detail-skeleton-content" /></div>;
  if (error || !property) return <div className="container not-found-state"><div className="empty-illustration"><MapPin size={28} /></div><h1>Este imóvel não está disponível.</h1><p>{error || 'O anúncio pode ter sido retirado ou ainda não foi publicado.'}</p><Link to="/imoveis" className="button button-primary"><ArrowLeft size={16} /> Voltar aos imóveis</Link></div>;

  return <div className="detail-page">
    <div className="container detail-breadcrumb"><Link to={returnTo}><ArrowLeft size={15} /> Voltar aos resultados</Link><div><Link to="/">Início</Link><span>/</span><Link to="/imoveis">Imóveis</Link><span>/</span><span>{property.code}</span></div></div>
    <section className="container detail-gallery-block">
      <div className="detail-gallery-main" onClick={() => setLightbox(true)} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter') setLightbox(true); }} aria-label="Ampliar foto do imóvel">
        <img src={mainImage.url} alt={mainImage.caption || property.title} />
        <span className={`badge-purpose detail-purpose ${property.purpose === 'rent' ? 'badge-rent' : ''}`}>{purposeLabel(property.purpose)}</span>
        {property.is_demo ? <span className="badge-demo detail-demo">Exemplo demonstrativo</span> : null}
        <button className="gallery-expand" type="button" onClick={(event) => { event.stopPropagation(); setLightbox(true); }}>Ampliar fotos <Maximize2 size={15} /></button>
      </div>
      <div className="detail-gallery-side">
        {images.slice(1, 3).map((image, index) => <button className="gallery-side-image" key={`${image.url}-${index}`} onClick={() => { setActiveImage(index + 1); setLightbox(true); }}><img src={image.url} alt={image.caption || property.title} loading="lazy" /></button>)}
        {images.length <= 1 && <div className="gallery-side-placeholder"><ShieldCheck size={22} /><span>Imóvel selecionado</span></div>}
        <button className="gallery-count" type="button" onClick={() => setLightbox(true)}><span>{images.length.toString().padStart(2, '0')}</span><small>fotos</small></button>
      </div>
    </section>

    <section className="container detail-main-grid">
      <div className="detail-content">
        <div className="detail-title-row"><div><span className="eyebrow">{propertyTypeLabel(property.type)} · CÓDIGO {property.code}</span><h1>{property.title}</h1><p className="detail-location"><MapPin size={17} /> {property.neighborhood ? `${property.neighborhood}, ` : ''}{property.city} — {property.state}</p></div><div className="detail-icon-actions"><button className={`round-action ${saved ? 'is-saved' : ''}`} aria-label={saved ? 'Remover dos favoritos' : 'Salvar imóvel'} onClick={toggleSaved}><Heart size={19} fill={saved ? 'currentColor' : 'none'} /></button><button className="round-action" aria-label="Compartilhar imóvel" onClick={share}><Share2 size={18} /></button></div></div>
        <div className={`detail-price-bar ${property.purpose === 'both' ? 'detail-price-both' : ''}`}><div className="detail-price-primary">{property.purpose === 'both' ? <><div><span>Venda</span><strong>{currency(property.sale_price)}</strong></div><div><span>Aluguel mensal</span><strong>{currency(property.rent_price)}<small>/ mês</small></strong></div></> : <><span>{property.purpose === 'rent' ? 'Valor mensal' : 'Valor do imóvel'}</span><strong>{currency(price)}{property.purpose === 'rent' && <small>/ mês</small>}</strong></>}</div><div className="detail-price-extra">{property.condo_fee ? <span>Condomínio <strong>{currency(property.condo_fee)}<small>/ mês</small></strong></span> : null}{property.iptu ? <span>IPTU <strong>{currency(property.iptu)}<small>/{property.iptu_period === 'monthly' ? 'mês' : 'ano'}</small></strong></span> : null}</div></div>
        <div className="detail-features">
          {property.bedrooms > 0 && <div><BedDouble size={19} /><strong>{property.bedrooms}</strong><span>quartos</span></div>}
          {property.suites > 0 && <div><BedDouble size={19} /><strong>{property.suites}</strong><span>suítes</span></div>}
          {property.bathrooms > 0 && <div><ShowerHead size={19} /><strong>{property.bathrooms}</strong><span>banheiros</span></div>}
          {property.parking > 0 && <div><Warehouse size={19} /><strong>{property.parking}</strong><span>vagas</span></div>}
          {property.area_built && <div><Maximize2 size={18} /><strong>{property.area_built}</strong><span>m² de área</span></div>}
        </div>
        <div className="detail-description"><span className="eyebrow">SOBRE O IMÓVEL</span><h2>Um espaço para viver seus planos.</h2><p>{property.description}</p></div>
        {property.features?.length > 0 && <div className="detail-amenities"><span className="eyebrow">CARACTERÍSTICAS</span><h2>O que faz diferença no dia a dia.</h2><div className="amenities-list">{property.features.map((feature) => <span key={feature.id || feature.name}><Check size={15} />{feature.name}</span>)}</div></div>}
        {property.virtual_tour_url && <a className="detail-tour-link" href={property.virtual_tour_url} target="_blank" rel="noreferrer"><span><Share2 size={16} /></span><div><strong>Conheça mais do imóvel</strong><small>Abrir vídeo ou tour virtual em nova aba</small></div><ArrowRight size={15} /></a>}
        <div className="detail-location-note"><MapPin size={20} /><div><strong>Localização aproximada</strong><p>{property.city}, {property.state}{property.neighborhood ? ` · ${property.neighborhood}` : ''}. O endereço completo não é exibido publicamente.</p></div></div>
        {property.is_demo ? <div className="detail-demo-disclaimer"><ShieldCheck size={17} /><span>Conteúdo demonstrativo: este imóvel é um exemplo de apresentação da plataforma e não é uma oferta real.</span></div> : null}
      </div>
      <aside className="lead-card-wrap"><div className="lead-card"><div className="lead-card-heading"><div className="lead-avatar">RN</div><div><strong>Fale com a nossa equipe</strong><span>Estamos aqui para ajudar</span></div></div>{sent ? <div className="form-success"><div><Check size={23} /></div><h3>Mensagem recebida!</h3><p>Obrigado por entrar em contato. Nossa equipe poderá falar com você em breve.</p></div> : <form onSubmit={sendLead} className="lead-form"><p>Peça mais informações sobre este imóvel.</p><label className="form-field"><span>Seu nome *</span><input name="name" required minLength={2} placeholder="Como podemos chamar você?" /></label><label className="form-field"><span>Telefone *</span><input name="phone" required type="tel" minLength={8} placeholder="(00) 00000-0000" /></label><label className="form-field"><span>E-mail <small>opcional</small></span><input name="email" type="email" placeholder="voce@email.com" /></label><label className="form-field"><span>Mensagem</span><textarea name="message" rows={3} defaultValue={`Olá! Tenho interesse no imóvel ${property.code}. Gostaria de receber mais informações.`} /></label><label className="consent-check"><input name="consent" type="checkbox" required /><span>Concordo com o tratamento dos meus dados para receber retorno sobre este contato. Consulte a <Link to="/privacidade">política de privacidade</Link>.</span></label>{formError && <p className="form-error">{formError}</p>}<button className="button button-primary button-full" type="submit" disabled={sending}>{sending ? 'Enviando…' : 'Solicitar informações'} <ArrowRight size={16} /></button></form>}{waNumber ? <a className="whatsapp-link" href={`https://wa.me/${waNumber}?text=${waMessage}`} target="_blank" rel="noreferrer">Conversar pelo WhatsApp <ArrowRight size={15} /></a> : <p className="whatsapp-pending">WhatsApp comercial ainda não configurado.</p>}</div><div className="privacy-note"><ShieldCheck size={15} /><span>Seus dados são tratados com cuidado e usados somente para responder à sua solicitação.</span></div></aside>
    </section>
    {similar.length > 0 && <section className="section container similar-section"><div className="section-heading section-heading-row"><div><span className="eyebrow">TALVEZ VOCÊ TAMBÉM GOSTE</span><h2>Outros lugares para descobrir.</h2></div><Link to={`/imoveis?city=${encodeURIComponent(property.city)}`} className="text-link">Ver mais em {property.city} <ArrowRight size={16} /></Link></div><div className="property-grid">{similar.map((item) => <PropertyCard key={item.id} property={item} />)}</div></section>}
    {lightbox && <div className="lightbox" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setLightbox(false); }}><button className="lightbox-close" aria-label="Fechar galeria" onClick={() => setLightbox(false)}><X size={23} /></button><button className="lightbox-arrow lightbox-prev" aria-label="Foto anterior" onClick={() => setImage(-1)}><ChevronLeft size={25} /></button><figure><img src={mainImage.url} alt={mainImage.caption || property.title} /><figcaption>{mainImage.caption || property.title} <span>{activeImage + 1} / {images.length}</span></figcaption></figure><button className="lightbox-arrow lightbox-next" aria-label="Próxima foto" onClick={() => setImage(1)}><ChevronRight size={25} /></button></div>}
  </div>;
}
