export type ArticleStatus = 'draft' | 'published' | 'archived';

export interface DirectusListResponse<T> {
  data: T[];
  meta?: {
    filter_count?: number;
    total_count?: number;
  };
}

export interface DirectusItemResponse<T> {
  data: T;
}

export interface Channel {
  id: string;
  name: string;
  slug: string;
  type?: string;
}

export interface Article {
  id: string;
  title: string;
  slug?: string;
  status: ArticleStatus;
  summary?: string;
  content?: string;
  cover?: string;
  publish_at?: string;
  main_channel?: Channel;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface PageContent {
  id: string;
  title: string;
  slug: string;
  status: ArticleStatus;
  content?: string;
}

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
  link_url?: string;
  status?: ArticleStatus;
}

export interface BusinessSector {
  id: string;
  title: string;
  slug: string;
  description?: string;
  status?: ArticleStatus;
}

export interface SiteSettings {
  site_name: string;
  logo?: string;
  footer_text?: string;
}
