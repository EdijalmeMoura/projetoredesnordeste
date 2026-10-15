import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, Check, Mail, MessageCircle, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { setPageMeta } from '../lib/seo';
import type { SiteSettings } from '../types';

export default function ContactPage() {
  const [settings, setSettings] = useState<SiteSettings>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setPageMeta('Contato | Projeto Redes Nordeste', 'Fale com a equipe do Projeto Redes Nordeste sobre imóveis, atendimento ou sua próxima mudança.'); api<SiteSettings>('/api/public/settings').then(setSettings).catch(() => undefined); }, []);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSending(true); setError('');
    const form = new FormData(event.currentTarget); const formElement = event.currentTarget;
    try {
      await api('/api/public/leads', { method: 'POST', body: { name: form.get('name'), phone: form.get('phone'), email: form.get('email'), message: form.get('message'), consent: form.get('consent') === 'on', source: 'contact-page' } });
      setSent(true); formElement.reset();
    } catch (issue) { setError((issue as Error).message); }
    finally { setSending(false); }
  };
  const whatsapp = (settings.whatsapp || '').replace(/\D/g, '');
  return <div className="contact-page"><section className="content-hero contact-hero"><div className="container"><span className="eyebrow eyebrow-light">ESTAMOS POR AQUI</span><h1>Uma boa conversa<br />pode mudar tudo.</h1><p>Conte o que você está procurando. A gente ajuda a encontrar o caminho.</p></div></section><section className="container contact-content"><div className="contact-intro"><span className="eyebrow">FALE COM A GENTE</span><h2>Vamos encontrar<br />uma boa solução.</h2><p>Seja para encontrar seu próximo lar ou para conversar sobre um imóvel, estamos prontos para ouvir.</p><div className="contact-methods">{settings.phone && <a href={`tel:${settings.phone.replace(/\D/g, '')}`}><span><Phone size={18} /></span><div><small>Telefone</small><strong>{settings.phone}</strong></div></a>}{settings.email && <a href={`mailto:${settings.email}`}><span><Mail size={18} /></span><div><small>E-mail</small><strong>{settings.email}</strong></div></a>}{whatsapp && <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer"><span><MessageCircle size={18} /></span><div><small>WhatsApp</small><strong>Iniciar conversa</strong></div></a>}{!settings.phone && !settings.email && !whatsapp && <div className="contact-config-note"><MessageCircle size={18} /><span>Os canais comerciais estão sendo configurados. Envie sua mensagem pelo formulário e ela será registrada para atendimento.</span></div>}</div></div><div className="contact-form-card">{sent ? <div className="form-success"><div><Check size={23} /></div><h3>Mensagem enviada.</h3><p>Obrigado por conversar com a gente. Sua solicitação foi registrada.</p><button className="button button-outline" onClick={() => setSent(false)}>Enviar outra mensagem</button></div> : <form className="lead-form" onSubmit={submit}><span className="eyebrow">MENSAGEM</span><h3>Como podemos ajudar?</h3><label className="form-field"><span>Seu nome *</span><input name="name" required minLength={2} placeholder="Nome completo" /></label><label className="form-field"><span>Telefone *</span><input name="phone" required type="tel" minLength={8} placeholder="(00) 00000-0000" /></label><label className="form-field"><span>E-mail</span><input name="email" type="email" placeholder="voce@email.com" /></label><label className="form-field"><span>Sua mensagem *</span><textarea name="message" rows={4} required placeholder="Conte como podemos ajudar" /></label><label className="consent-check"><input name="consent" type="checkbox" required /><span>Autorizo o uso dos meus dados para receber retorno sobre esta solicitação. Consulte a <Link to="/privacidade">política de privacidade</Link>.</span></label>{error && <p className="form-error">{error}</p>}<button className="button button-primary button-full" disabled={sending}>{sending ? 'Enviando…' : 'Enviar mensagem'} <ArrowRight size={16} /></button></form>}</div></section></div>;
}
