import { useEffect, useState, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import { api } from '../lib/api';
import type { SiteSettings } from '../types';

export default function PublicLayout({ children }: { children?: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>({ businessName: 'Projeto Redes Nordeste' });
  useEffect(() => { api<SiteSettings>('/api/public/settings').then(setSettings).catch(() => undefined); }, []);
  return <div className="public-shell"><SiteHeader settings={settings} /><main>{children || <Outlet context={settings} />}</main><SiteFooter settings={settings} /></div>;
}
