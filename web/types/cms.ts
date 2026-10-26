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
  parent?: string;
  type?: string;
  path?: string;
  sort?: number;
  status?: string;
  visible?: boolean;
  isNewsCategory?: boolean;
}

export interface Article {
  id: string;
  title: string;
  slug?: string;
  subtitle?: string;
  status: ArticleStatus;
  summary?: string;
  content?: string;
  attachments?: ArticleAttachment[];
  cover?: string;
  source?: string;
  author?: string;
  publish_at?: string;
  publishAt?: string;
  publishDate?: string;
  isTop?: boolean;
  isHomeRecommend?: boolean;
  sort?: number;
  newsSubcategory?: string;
  main_channel?: Channel;
  mainChannel?: Channel | null;
  main_channels?: Channel[];
  mainChannels?: Channel[];
}

export interface ArticleAttachment {
  title: string;
  url: string;
}

export interface PublicArticleListPayload {
  page: number;
  pageSize: number;
  total: number;
  items: Article[];
}

export interface Company {
  id: string;
  name: string;
  shortName?: string;
  slug: string;
  logo?: string;
  cover?: string;
  intro?: string;
  address?: string;
  mainBusiness?: string;
  registeredCapital?: string;
  description?: string;
  status?: string;
}

export interface PageContent {
  id: string;
  module_code?: string;
  title: string;
  slug: string;
  subtitle?: string;
  cover?: string;
  summary?: string;
  content?: string;
  extra_json?: Record<string, unknown>;
  status: ArticleStatus;
}

export interface HistoryTimelineItem {
  id: string;
  year: string;
  title: string;
  description: string;
  sort: number;
}

export interface HonorItem {
  id: string;
  title: string;
  year: string;
  image: string;
  description: string;
  attachmentUrl: string;
  attachmentName: string;
  sort: number;
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
  title?: string;
  name?: string;
  slug: string;
  cover?: string;
  intro?: string;
  description?: string;
  status?: ArticleStatus;
}

export interface SiteSettings {
  site_name: string;
  logo?: string;
  footer_text?: string;
}
