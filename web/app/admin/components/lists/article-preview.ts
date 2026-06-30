'use client';

import type { ArticleRow, Channel } from './types';

export type PreviewAttachment = {
  title?: string;
  url?: string;
};

export type PreviewArticle = {
  id: string;
  title?: string;
  subtitle?: string;
  summary?: string;
  cover?: string | { id?: string };
  main_channel?: Channel;
  status?: 'draft' | 'published' | 'archived' | string;
  publish_at?: string;
  source?: string;
  author?: string;
  content?: string;
  attachments?: PreviewAttachment[];
};

const getAttachmentAssetId = (attachment: unknown) => {
  if (!attachment || typeof attachment !== 'object') return '';
  const item = attachment as {
    file?: string | { id?: string } | null;
    directus_files_id?: string | { id?: string } | null;
    file_id?: string | null;
  };
  const rawFile = item.file ?? item.directus_files_id ?? item.file_id;
  if (typeof rawFile === 'string') return rawFile;
  if (rawFile && typeof rawFile === 'object') return rawFile.id || '';
  return '';
};

export const normalizePreviewArticle = (value: unknown): PreviewArticle | null => {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  const rawAttachments = Array.isArray(item.attachments) ? item.attachments : [];

  return {
    id: String(item.id || ''),
    title: typeof item.title === 'string' ? item.title : '',
    subtitle: typeof item.subtitle === 'string' ? item.subtitle : '',
    summary: typeof item.summary === 'string' ? item.summary : '',
    cover: (typeof item.cover === 'string' || (item.cover && typeof item.cover === 'object')) ? item.cover as PreviewArticle['cover'] : '',
    main_channel: item.main_channel && typeof item.main_channel === 'object' ? item.main_channel as Channel : undefined,
    status: typeof item.status === 'string' ? item.status : 'draft',
    publish_at: typeof item.publish_at === 'string' ? item.publish_at : '',
    source: typeof item.source === 'string' ? item.source : '',
    author: typeof item.author === 'string' ? item.author : '',
    content: typeof item.content === 'string' ? item.content : '',
    attachments: rawAttachments.map((attachment, index) => {
      const assetId = getAttachmentAssetId(attachment);
      const current = attachment && typeof attachment === 'object' ? attachment as Record<string, unknown> : {};
      return {
        title: typeof current.title === 'string' ? current.title : `附件${index + 1}`,
        url: assetId ? `/admin-api/assets/${encodeURIComponent(assetId)}` : '',
      };
    }).filter((attachment) => attachment.url),
  };
};

export const formatPreviewDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
};

export const getCoverId = (cover: ArticleRow['cover'] | PreviewArticle['cover']) => {
  if (!cover) return '';
  if (typeof cover === 'object') return cover.id || '';
  return cover;
};
