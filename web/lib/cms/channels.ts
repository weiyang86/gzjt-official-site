import { buildDirectusPath, cmsPublicFetch } from './client';
import type { Channel, DirectusListResponse } from '@/types/cms';

export const isNoticeChannel = (item: Channel) => Boolean(item) && (
  item.type === 'notice'
  || item.slug === 'announcements'
  || (typeof item.path === 'string' && item.path.startsWith('/disclosure'))
);

export const isNewsChannel = (item: Channel) => Boolean(item) && (
  !isNoticeChannel(item) && (
    item.type === 'news'
    || item.isNewsCategory === true
  )
);

export type PublicScope = '' | 'news' | 'notice';

export async function getChannels(type?: PublicScope | string) {
  const params = {
    fields: 'id,name,slug,type',
    sort: 'sort,name',
  };

  const response = await cmsPublicFetch<DirectusListResponse<Channel>>(buildDirectusPath('/items/channels', {
    ...params,
    ...(type ? { 'filter[type][_eq]': type } : {}),
  }));

  return response;
}

export async function getPublicChannels(scope: PublicScope = '') {
  const channels = await cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/channels', {
    fields: 'id,name,slug,type,path,sort,status,visible,is_news_category',
    limit: -1,
    sort: 'sort,id',
    'filter[status][_eq]': 'enabled',
    'filter[visible][_eq]': true,
  }));

  const items: Channel[] = (Array.isArray(channels?.data) ? channels.data : []).map((item) => ({
    id: String(item.id ?? ''),
    name: String(item.name ?? ''),
    slug: String(item.slug ?? ''),
    type: String(item.type ?? ''),
    path: String(item.path ?? ''),
    sort: Number(item.sort) || 0,
    status: String(item.status ?? ''),
    visible: item.visible !== false,
    isNewsCategory: item.type === 'news' || item.is_news_category === true,
  }));

  if (scope === 'notice') return items.filter(isNoticeChannel);
  if (scope === 'news') return items.filter(isNewsChannel);
  return items;
}
