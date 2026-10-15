export const currency = (value: number | null | undefined, compact = false) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'Consulte';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: compact ? 0 : 0,
    notation: compact && Number(value) >= 1_000_000 ? 'compact' : 'standard',
  }).format(Number(value));
};

export const shortCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return 'Consulte';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(Number(value));
};

export const purposeLabel = (purpose?: string) => ({ sale: 'Venda', rent: 'Aluguel', both: 'Venda e aluguel' }[purpose || ''] || 'Imóvel');
export const propertyTypeLabel = (type?: string) => ({
  house: 'Casa', apartment: 'Apartamento', penthouse: 'Cobertura', duplex: 'Duplex', land: 'Terreno', studio: 'Studio', commercial: 'Comercial', other: 'Outro',
}[type || ''] || type || 'Imóvel');
export const availabilityLabel = (status?: string) => ({
  available: 'Disponível', reserved: 'Reservado', negotiation: 'Em negociação', sold: 'Vendido', rented: 'Alugado',
}[status || ''] || '—');
export const publicationLabel = (status?: string) => ({
  draft: 'Rascunho', pending_review: 'Em aprovação', published: 'Publicado', archived: 'Arquivado',
}[status || ''] || '—');
export const leadStatusLabel = (status?: string) => ({
  new: 'Novo contato', awaiting: 'Aguardando atendimento', contacted: 'Em contato', visit: 'Visita agendada', proposal: 'Proposta enviada', negotiation: 'Em negociação', converted: 'Convertido', lost: 'Perdido',
}[status || ''] || status || '—');
export const leadStatuses = ['new', 'awaiting', 'contacted', 'visit', 'proposal', 'negotiation', 'converted', 'lost'];
export const leadStatusColors: Record<string, string> = {
  new: '#176B87', awaiting: '#D68A25', contacted: '#6C63C7', visit: '#2477A7', proposal: '#C07822', negotiation: '#A86425', converted: '#25845F', lost: '#778394',
};
export const formatDate = (value?: string | null, withTime = false) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', withTime ? { dateStyle: 'short', timeStyle: 'short' } : { dateStyle: 'medium' }).format(date);
};
export const formatMonth = (value?: string) => {
  if (!value) return '';
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(year, month - 1, 1)).replace('.', '');
};
export const phoneDigits = (value: string) => value.replace(/\D/g, '');
