export type Purpose = 'sale' | 'rent' | 'both';
export type PublicationStatus = 'draft' | 'pending_review' | 'published' | 'archived';
export type AvailabilityStatus = 'available' | 'reserved' | 'negotiation' | 'sold' | 'rented';

export interface PropertyImage {
  id?: number;
  url: string;
  caption?: string;
  sort_order?: number;
  is_cover?: number | boolean;
}

export interface Feature {
  id?: number;
  name: string;
  slug?: string;
}

export interface Property {
  id: number;
  code: string;
  title: string;
  slug: string;
  type: string;
  purpose: Purpose;
  description: string;
  publication_status: PublicationStatus;
  availability_status: AvailabilityStatus;
  is_featured: number;
  is_demo: number;
  sale_price: number | null;
  rent_price: number | null;
  condo_fee?: number | null;
  iptu?: number | null;
  iptu_period?: string;
  state: string;
  city: string;
  neighborhood: string;
  zip?: string;
  street?: string;
  number?: string;
  complement?: string;
  reference_point?: string;
  latitude?: number | null;
  longitude?: number | null;
  show_exact_address?: number;
  area_built: number | null;
  area_land?: number | null;
  bedrooms: number;
  suites: number;
  bathrooms: number;
  parking: number;
  rooms?: number;
  floors?: number;
  year_built?: number | null;
  owner_id?: number | null;
  owner_name?: string | null;
  agent_id?: number | null;
  agent_name?: string | null;
  exclusive?: number;
  advertise_start?: string | null;
  advertise_until?: string | null;
  internal_notes?: string;
  commercial_notes?: string;
  virtual_tour_url?: string;
  created_by?: number;
  created_at: string;
  updated_at?: string;
  published_at?: string | null;
  images: PropertyImage[];
  features: Feature[];
}

export interface Lead {
  id: number;
  name: string;
  phone: string;
  email: string;
  purpose: string;
  budget_min: number | null;
  budget_max: number | null;
  message: string;
  source: string;
  agent_id: number | null;
  agent_name?: string | null;
  status: string;
  first_contact_at: string;
  last_interaction_at?: string | null;
  next_activity_at?: string | null;
  created_at: string;
  property_id?: number;
  property_code?: string;
  property_title?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'administrator' | 'manager' | 'agent' | 'editor';
}

export interface SiteSettings {
  businessName?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  instagram?: string;
  facebook?: string;
  institutionalText?: string;
  logoUrl?: string;
}
