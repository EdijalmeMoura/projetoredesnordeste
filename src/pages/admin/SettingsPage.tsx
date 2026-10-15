import { useEffect, useState, type FormEvent } from 'react';
import { Check, FileText, Globe2, Image, Instagram, Mail, MessageCircle, Phone, Save, ShieldCheck } from 'lucide-react';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import type { SiteSettings } from '../../types';

interface SitePage { id: number; slug: string; title: string; content: string; meta_description: string; updated_at: string; }
const pageLabels: Record<string, string> = { sobre: 'Sobre a empresa', privacidade: 'Política de privacidade', termos: 'Termos de uso' };
const fields: { key: keyof SiteSettings; label: string; type?: string; placeholder?: string; icon?: typeof Phone }[] = [
  { key: 'businessName', label: 'Nome institucional', placeholder: 'Projeto Redes Nordeste' },
  { key: 'phone', label: 'Telefone comercial', type: 'tel', placeholder: '(81) 0000-0000', icon: Phone },
  { key: 'email', label: 'E-mail de contato', type: 'email', placeholder: 'contato@empresa.com.br', icon: Mail },
  { key: 'whatsapp', label: 'WhatsApp comercial', type: 'tel', placeholder: '5581999999999', icon: MessageCircle },
  { key: 'instagram', label: 'Instagram', type: 'url', placeholder: 'https://instagram.com/...', icon: Instagram },
  { key: 'facebook', label: 'Facebook', type: 'url', placeholder: 'https://facebook.com/...', icon: Globe2 },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<SiteSettings>({});
  const [pages, setPages] = useState<SitePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { notify } = useToast();
  useEffect(() => {
    Promise.all([api<{ settings: SiteSettings }>('/api/admin/settings'), api<{ pages: SitePage[] }>('/api/admin/content-pages')])
      .then(([settingsResult, pageResult]) => { setSettings(settingsResult.settings); setPages(pageResult.pages); })
      .catch((issue) => notify(issue.message, 'error'))
      .finally(() => setLoading(false));
  }, []);
  const set = (key: keyof SiteSettings, value: string) => setSettings((current) => ({ ...current, [key]: value }));
  const save = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true);
    try { const result = await api<{ settings: SiteSettings }>('/api/admin/settings', { method: 'PUT', body: settings }); setSettings(result.settings); notify('Configurações do site atualizadas.'); }
    catch (issue) { notify((issue as Error).message, 'error'); }
    finally { setSaving(false); }
  };
  const updatePage = (slug: string, field: keyof SitePage, value: string) => setPages((current) => current.map((page) => page.slug === slug ? { ...page, [field]: value } : page));
  const savePage = async (page: SitePage) => {
    try {
      const result = await api<{ page: SitePage }>(`/api/admin/content-pages/${page.slug}`, { method: 'PUT', body: page });
      setPages((current) => current.map((item) => item.slug === page.slug ? result.page : item));
      notify(`${pageLabels[page.slug] || 'Página'} atualizada.`);
    } catch (issue) { notify((issue as Error).message, 'error'); }
  };
  if (loading) return <div className="editor-loading"><span>Carregando configurações…</span></div>;
  return <div className="admin-page settings-page">
    <div className="admin-page-heading"><div><span className="eyebrow">PRESENÇA DIGITAL</span><h2>Configurações do site</h2><p>Atualize a identidade, os canais e os textos das páginas públicas.</p></div><button className="button button-primary" form="settings-form" disabled={saving}><Save size={16} /> {saving ? 'Salvando…' : 'Salvar alterações'}</button></div>
    <form id="settings-form" onSubmit={save} className="settings-layout"><div className="settings-main">
      <section className="admin-panel settings-card"><div className="settings-section-title"><span className="settings-section-icon"><Globe2 size={18} /></span><div><span className="eyebrow">IDENTIDADE DA MARCA</span><h3>Informações principais</h3><p>Estas informações aparecem no cabeçalho, rodapé e metadados do site.</p></div></div><div className="settings-fields-grid">{fields.map(({ key, label, type, placeholder, icon: Icon }) => <label className="form-field" key={key}><span>{label}</span><div className="settings-input-wrap">{Icon && <Icon size={16} />}<input type={type || 'text'} value={String(settings[key] || '')} onChange={(e) => set(key, e.target.value)} placeholder={placeholder} /></div></label>)}</div><label className="form-field settings-full-field"><span>Texto institucional</span><textarea rows={5} value={settings.institutionalText || ''} onChange={(e) => set('institutionalText', e.target.value)} placeholder="Conte o que torna a empresa especial." /><small className="field-hint">Texto apresentado em áreas institucionais.</small></label></section>
      <section className="admin-panel settings-card"><div className="settings-section-title"><span className="settings-section-icon settings-image-icon"><Image size={18} /></span><div><span className="eyebrow">IDENTIDADE VISUAL</span><h3>Logotipo e favicon</h3><p>Configure um endereço de imagem hospedada para personalizar a marca.</p></div></div><label className="form-field"><span>URL do logotipo (opcional)</span><input type="url" value={settings.logoUrl || ''} onChange={(e) => set('logoUrl', e.target.value)} placeholder="https://... ou /uploads/logo.png" /><small className="field-hint">Para enviar um arquivo, use o gerenciador de imagens e cole o caminho persistente.</small></label>{settings.logoUrl && <div className="logo-preview"><img src={settings.logoUrl} alt="Prévia do logotipo" onError={(e) => { e.currentTarget.style.display = 'none'; }} /><span>Prévia do logotipo</span></div>}</section>
      <section className="admin-panel settings-card content-settings-card"><div className="settings-section-title"><span className="settings-section-icon"><FileText size={18} /></span><div><span className="eyebrow">CONTEÚDO INSTITUCIONAL</span><h3>Páginas públicas</h3><p>Edite textos, políticas e metadados sem alterar o código-fonte.</p></div></div>{pages.map((page) => <article className="content-edit-card" key={page.slug}><div className="content-edit-head"><div><span className="eyebrow">{pageLabels[page.slug] || page.slug}</span><strong>{page.title}</strong></div><button type="button" className="button button-outline button-small" onClick={() => void savePage(page)}><Save size={14} /> Salvar página</button></div><label className="form-field"><span>Título</span><input value={page.title} onChange={(e) => updatePage(page.slug, 'title', e.target.value)} /></label><label className="form-field"><span>Descrição para buscadores</span><input maxLength={320} value={page.meta_description} onChange={(e) => updatePage(page.slug, 'meta_description', e.target.value)} /></label><label className="form-field"><span>Conteúdo</span><textarea rows={5} value={page.content} onChange={(e) => updatePage(page.slug, 'content', e.target.value)} /></label></article>)}</section>
    </div><aside className="settings-side"><div className="settings-side-card"><span className="settings-side-icon"><ShieldCheck size={20} /></span><h3>Configuração protegida</h3><p>Somente administradores podem salvar estas informações. Alterações são registradas na auditoria.</p><div className="settings-side-line"><Check size={14} /> Canais públicos configuráveis</div><div className="settings-side-line"><Check size={14} /> Sem dados de contato inventados</div></div><div className="settings-side-card settings-pending-card"><span className="eyebrow">INTEGRAÇÕES</span><h3>Serviços externos</h3><ul><li>WhatsApp abre conversa manual</li><li>Envio de e-mail não automatizado</li><li>Consulta de CEP ainda não conectada</li><li>Mapas dependem de provedor configurado</li></ul><p>Automatizações permanecem desativadas até que suas credenciais estejam configuradas.</p></div></aside></form>
  </div>;
}
