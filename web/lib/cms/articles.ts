import { cmsFetch } from './client';
import type { Article, DirectusListResponse } from '@/types/cms';

const publishedFilter = 'filter[status][_eq]=published';

export async function getPublishedArticles(limit = 10) {
  const params = new URLSearchParams({
    limit: String(limit),
    sort: '-publish_at',
    fields: 'id,title,slug,status,summary,cover,publish_at,main_channel.id,main_channel.name,main_channel.slug',
  });

  return cmsFetch<DirectusListResponse<Article>>(`/items/articles?${publishedFilter}&${params.toString()}`);
}

export async function getPublishedArticleById(id: string) {
  const params = new URLSearchParams({
    limit: '1',
    'filter[id][_eq]': id,
    fields: 'id,title,slug,status,summary,content,cover,publish_at,main_channel.id,main_channel.name,main_channel.slug',
  });

  const response = await cmsFetch<DirectusListResponse<Article>>(`/items/articles?${publishedFilter}&${params.toString()}`);
  return response.data[0] || null;
}
