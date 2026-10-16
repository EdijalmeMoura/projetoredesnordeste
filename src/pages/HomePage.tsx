import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import SearchPanel from '../components/SearchPanel';
import PropertyCard from '../components/PropertyCard';
import { api } from '../lib/api';
import type { Property } from '../types';
import { setPageMeta } from '../lib/seo';

export default function HomePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { setPageMeta('Projeto Redes Nordeste | Imóveis no Nordeste', 'Encontre imóveis para comprar ou alugar no Nordeste com atendimento próximo e informações claras.'); }, []);
  useEffect(() => {
    api<{ properties: Property[] }>('/api/public/properties?limit=3&sort=relevance')
      .then((result) => setProperties(result.properties.filter((property) => property.is_featured)))
      .catch(() => setProperties([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="home-editorial">
      <section className="home-hero">
        <div className="container home-hero-grid">
          <div className="home-hero-copy">
            <span className="eyebrow home-hero-eyebrow">PROJETO REDES NORDESTE <i /> IMÓVEIS</span>
            <h1>Encontre seu lugar<br /><em>no Nordeste.</em></h1>
            <p>Casas, apartamentos e terrenos para comprar ou alugar. Informação clara, atendimento próximo e um olhar atento para cada cidade.</p>
            <div className="home-hero-actions"><Link to="/imoveis" className="button button-primary">Ver imóveis <ArrowRight size={16} /></Link><Link to="/sobre" className="home-quiet-link">Conheça a REDES <ArrowUpRight size={15} /></Link></div>
            <div className="home-hero-index"><span>01</span><span>Imóveis e relações feitos de perto.</span></div>
          </div>
          <figure className="home-hero-image">
            <img src="/assets/hero-home.jpg" alt="Residência tropical contemporânea em meio à vegetação, imagem ilustrativa" fetchPriority="high" />
            <figcaption><span>Imagem ilustrativa</span><span>Conteúdo demonstrativo</span></figcaption>
          </figure>
        </div>
        <div className="container home-search-shell">
          <div className="home-search-heading"><span>BUSCA DE IMÓVEIS</span><span>Escolha a finalidade e refine a busca</span></div>
          <SearchPanel />
        </div>
      </section>

      <section className="redes-statement">
        <div className="container redes-statement-inner">
          <span className="eyebrow eyebrow-light">O JEITO REDES</span>
          <p className="redes-statement-main">Você investe.<br /><span>A REDES gere.</span></p>
          <div className="redes-statement-support"><strong>A comunidade cresce.<br /><span>Todos ganham.</span></strong><p>Conectamos investidores, hóspedes e negócios locais por meio do turismo e de uma gestão próxima.</p></div>
        </div>
      </section>

      <section className="section home-featured container">
        <div className="section-heading section-heading-row">
          <div><span className="eyebrow">CATÁLOGO DE IMÓVEIS</span><h2>Uma seleção para<br />conhecer melhor.</h2></div>
          <div className="home-featured-side"><p>Explore opções para morar ou investir. Converse com a equipe para confirmar disponibilidade e condições.</p><Link to="/imoveis" className="text-link">Ver todo o catálogo <ArrowRight size={16} /></Link></div>
        </div>
        <div className="demo-note"><span className="demo-note-mark">i</span><span>Os imóveis identificados como <strong>Exemplo</strong> são conteúdo demonstrativo, não ofertas reais.</span></div>
        {loading ? <div className="property-grid">{[1, 2, 3].map((i) => <div className="property-skeleton" key={i} />)}</div> : properties.length ? <div className="property-grid">{properties.slice(0, 3).map((property) => <PropertyCard key={property.id} property={property} />)}</div> : <div className="empty-inline"><Building2 size={25} /><p>Novos imóveis em destaque aparecerão aqui.</p><Link to="/imoveis">Ver catálogo</Link></div>}
      </section>

      <section className="home-about">
        <div className="container home-about-grid">
          <div className="home-about-copy"><span className="eyebrow eyebrow-muted">SOBRE O PROJETO REDES</span><h2>Mais do que imóveis, relações de confiança.</h2><p>O Projeto REDES aproxima investidores, hóspedes e negócios locais pelo turismo e pela gestão humanizada. Nesta plataforma, ampliamos essa conexão com uma curadoria de imóveis residenciais para compra e aluguel no Nordeste.</p><Link to="/sobre" className="home-quiet-link">Nossa história <ArrowRight size={15} /></Link></div>
          <div className="home-about-list">
            <article><span>01</span><div><h3>Presença local</h3><p>Conhecimento da região e atenção às pessoas que fazem parte dela.</p></div></article>
            <article><span>02</span><div><h3>Informação clara</h3><p>Dados e condições para ajudar você a decidir com mais segurança.</p></div></article>
            <article><span>03</span><div><h3>Relações próximas</h3><p>Uma equipe disponível para conversar sobre o seu próximo passo.</p></div></article>
          </div>
        </div>
      </section>

      <section className="home-region section">
        <div className="container home-region-grid">
          <figure className="home-region-image"><img src="/assets/property-duplex.jpg" alt="Casa contemporânea em paisagem tropical, imagem ilustrativa" loading="lazy" /><figcaption>Imagem ilustrativa · Conteúdo demonstrativo</figcaption></figure>
          <div className="home-region-copy"><span className="eyebrow">PERNAMBUCO E NORDESTE</span><h2>Um bom endereço começa com uma boa conversa.</h2><p>Conte o que você procura ou fale com a nossa equipe para avaliar os próximos passos. Cada imóvel e disponibilidade devem ser confirmados diretamente.</p><div className="home-region-actions"><Link to="/imoveis" className="button button-primary">Explorar imóveis <ArrowRight size={16} /></Link><Link to="/contato" className="home-quiet-link">Falar com a equipe <ArrowUpRight size={15} /></Link></div></div>
        </div>
      </section>

      <section className="owner-cta home-owner-cta"><div className="container owner-cta-inner"><div><span className="eyebrow eyebrow-light">É PROPRIETÁRIO?</span><h2>Vamos conversar<br />sobre o seu imóvel.</h2><p>Envie as informações para análise da equipe. O formulário não publica o imóvel automaticamente.</p></div><Link to="/anuncie" className="button button-light">Enviar para análise <ArrowRight size={16} /></Link></div></section>
    </div>
  );
}
