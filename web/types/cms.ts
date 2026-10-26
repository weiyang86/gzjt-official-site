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

export interface Topic {
  id: string;
  slug: string;
  moduleCode: string;
  title: string;
  subtitle?: string;
  cover?: string;
  summary?: string;
  content?: string;
  status: ArticleStatus;
  sort: number;
  articleCount?: number;
}

export interface TopicArticle {
  id: string;
  articleId: string;
  title: string;
  summary?: string;
  status?: string;
  publishAt?: string;
  cover?: string;
  sort: number;
  itemStatus: 'enabled' | 'disabled';
  missing?: boolean;
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

export interface Project {
  id: string;
  name: string;
  type: string;
  location: string;
  summary: string;
  progress: string;
  image?: string;
  detail: string;
  mapX?: number;
  mapY?: number;
  sort: number;
  status: string;
}

export type MessageCategory = 'consult' | 'suggest' | 'complaint' | 'report' | 'other';

export type MessageStatus = 'pending' | 'processing' | 'replied' | 'closed';

export interface SiteMessage {
  id: string;
  name: string;
  phone: string;
  email: string;
  category: MessageCategory;
  content: string;
  status: MessageStatus;
  reply: string;
  note: string;
  handler: string;
  handledAt: string;
  trackCode: string;
  clientIp: string;
  sourcePath: string;
  createdAt: string;
}

export interface SiteMessageStatusView {
  status: MessageStatus;
  statusLabel: string;
  createdAt: string;
  handledAt: string;
  reply: string;
}

export interface RecruitmentJob {
  id: string;
  title: string;
  department: string;
  headcount: string;
  location: string;
  deadline: string;
  requirement: string;
  applyUrl: string;
  category: RecruitmentCategory;
  sort: number;
  status: string;
}

export type RecruitmentCategory = 'social' | 'campus' | 'internal';

export interface PageContent {
  id: string;
  title: string;
  slug: string;
  cover?: string;
  content?: string;
  status: ArticleStatus;
}

export interface PageModuleContent {
  id: string;
  moduleCode: string;
  title: string;
  subtitle: string;
  cover?: string;
  summary: string;
  content: string;
}

export interface PageModuleItem {
  id: string;
  title: string;
  subtitle: string;
  content: string;
  image?: string;
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

export type ResponsibilityCategory = 'report' | 'case' | 'activity';

export interface ResponsibilityAttachment {
  id: string;
  name: string;
  size?: number;
}

export interface ResponsibilityItem {
  id: string;
  category: ResponsibilityCategory;
  title: string;
  summary: string;
  year: string;
  image?: string;
  content: string;
  linkUrl: string;
  attachments: ResponsibilityAttachment[];
  sort: number;
}

export interface ResponsibilityContent {
  id: string;
  title: string;
  subtitle: string;
  cover?: string;
  summary: string;
  content: string;
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

export interface QuickLink {
  id: string;
  title: string;
  url: string;
  position?: string;
  sort?: number;
}

export interface FriendLink {
  id: string;
  title: string;
  url: string;
  position?: string;
  sort?: number;
}

export interface HonorItem {
  id: string;
  title: string;
  issuer: string;
  year: string;
  image?: string;
  description: string;
  sort: number;
}

export interface HonorContent {
  title: string;
  subtitle: string;
  summary: string;
  content: string;
}

export interface DownloadItem {
  id: string;
  title: string;
  category: string;
  date: string;
  fileId: string;
  url: string;
  filename: string;
  filesize: number;
  sort: number;
}
