import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, BadgeCheck, Building2, Compass, HeartHandshake, MapPin, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import SearchPanel from '../components/SearchPanel';
import PropertyCard from '../components/PropertyCard';
import { api } from '../lib/api';
import type { Property } from '../types';
import { setPageMeta } from '../lib/seo';

export default function HomePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const reduceMotion = useReducedMotion();
  useEffect(() => { setPageMeta('Projeto Redes Nordeste | Imóveis para viver bem', 'Encontre imóveis para comprar ou alugar no Nordeste. Descubra o espaço perfeito para sua próxima história.'); }, []);
  useEffect(() => {
    api<{ properties: Property[] }>('/api/public/properties?limit=3&sort=relevance')
      .then((result) => setProperties(result.properties.filter((property) => property.is_featured)))
      .catch(() => setProperties([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <section className="hero-section">
        <div className="hero-image" aria-hidden="true" />
        <div className="hero-shade" aria-hidden="true" />
        <div className="container hero-copy">
          <motion.div className="hero-text" initial={reduceMotion ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }}>
            <span className="eyebrow eyebrow-light"><span className="eyebrow-dot" /> CONEXÕES QUE ABREM CAMINHOS</span>
            <h1>Encontre o lugar<br /><em>ideal para viver.</em></h1>
            <p>Descubra imóveis para comprar ou alugar e encontre o espaço perfeito para sua próxima história.</p>
            <div className="hero-links"><Link to="/imoveis" className="button button-light">Explorar imóveis <ArrowRight size={17} /></Link><Link to="/contato" className="hero-text-link">Falar com um consultor <ArrowRight size={16} /></Link></div>
          </motion.div>
          <div className="hero-caption"><span className="hero-caption-line" /> <span>Um novo capítulo começa em casa.</span></div>
        </div>
        <div className="container hero-search-wrap"><SearchPanel /></div>
      </section>

      <section className="intro-strip container">
        <div className="intro-mark"><Compass size={21} /></div>
        <p><strong>Mais do que encontrar um imóvel.</strong> É encontrar o lugar onde a vida acontece.</p>
        <Link to="/sobre">Conheça nosso jeito <ArrowRight size={15} /></Link>
      </section>

      <section className="section section-featured container">
        <div className="section-heading section-heading-row">
          <div><span className="eyebrow">UMA SELEÇÃO PARA VOCÊ</span><h2>Imóveis que merecem<br />um olhar mais de perto.</h2></div>
          <Link to="/imoveis" className="text-link">Ver todos os imóveis <ArrowRight size={16} /></Link>
        </div>
        <div className="demo-note"><Sparkles size={15} /><span>Os cards identificados como <strong>Exemplo</strong> são demonstrativos e não representam anúncios reais.</span></div>
        {loading ? <div className="property-grid">{[1, 2, 3].map((i) => <div className="property-skeleton" key={i} />)}</div> : properties.length ? <div className="property-grid">{properties.slice(0, 3).map((property) => <PropertyCard key={property.id} property={property} />)}</div> : <div className="empty-inline"><Building2 size={25} /><p>Novos imóveis em destaque aparecerão aqui.</p><Link to="/imoveis">Ver catálogo</Link></div>}
      </section>

      <section className="section values-section">
        <div className="container values-grid">
          <div className="values-copy"><span className="eyebrow eyebrow-muted">NO SEU TEMPO, DO SEU JEITO</span><h2>Uma escolha importante<br />merece uma boa parceria.</h2><p>A casa certa não começa na busca. Começa quando alguém entende o que é importante para você. Estamos aqui para tornar esse caminho mais claro, seguro e próximo.</p><Link to="/sobre" className="button button-outline">Saiba mais sobre nós <ArrowRight size={16} /></Link></div>
          <div className="value-cards">
            <motion.article className="value-card value-card-green" whileHover={reduceMotion ? undefined : { y: -5 }}><div className="value-icon"><HeartHandshake size={21} /></div><span className="value-number">01</span><h3>Escuta de verdade</h3><p>Seu momento, suas prioridades e seu próximo passo vêm primeiro.</p></motion.article>
            <motion.article className="value-card value-card-blue" whileHover={reduceMotion ? undefined : { y: -5 }}><div className="value-icon"><ShieldCheck size={21} /></div><span className="value-number">02</span><h3>Mais tranquilidade</h3><p>Informação clara e acompanhamento em cada etapa da sua decisão.</p></motion.article>
            <motion.article className="value-card value-card-cream" whileHover={reduceMotion ? undefined : { y: -5 }}><div className="value-icon"><MapPin size={21} /></div><span className="value-number">03</span><h3>Olhar local</h3><p>Uma curadoria conectada às cidades, bairros e histórias do Nordeste.</p></motion.article>
            <motion.article className="value-card value-card-navy" whileHover={reduceMotion ? undefined : { y: -5 }}><div className="value-icon"><BadgeCheck size={21} /></div><span className="value-number">04</span><h3>Relação próxima</h3><p>Gente de verdade para ajudar você a escolher com confiança.</p></motion.article>
          </div>
        </div>
      </section>

      <section className="section container city-section">
        <div className="city-card">
          <div className="city-card-image" />
          <div className="city-card-content"><span className="eyebrow eyebrow-light">SEU PRÓXIMO ENDEREÇO</span><h2>Histórias novas<br />começam em casa.</h2><p>Explore opções para morar ou investir em diferentes cidades de Pernambuco.</p><Link to="/imoveis" className="button button-light">Encontrar meu lugar <ArrowRight size={16} /></Link></div>
          <div className="city-label"><MapPin size={14} /> Pernambuco, Brasil</div>
        </div>
      </section>

      <section className="owner-cta"><div className="container owner-cta-inner"><div><span className="eyebrow eyebrow-light">TEM UM IMÓVEL?</span><h2>Vamos encontrar<br />a pessoa certa.</h2><p>Conte um pouco sobre o seu imóvel. Nossa equipe vai analisar as informações e entrar em contato.</p></div><Link to="/anuncie" className="button button-light">Quero anunciar <ArrowRight size={17} /></Link></div></section>
    </>
  );
}
