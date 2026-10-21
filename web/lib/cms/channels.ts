import { buildDirectusPath, cmsPublicFetch } from './client';
import type { Channel, DirectusListResponse } from '@/types/cms';

export const isNoticeChannel = (item: Channel) => Boolean(item) && (
  item.type === 'notice'
  || item.slug === 'announcements'
  || (typeof item.path === 'string' && item.path.startsWith('/disclosure'))
);

export const isNewsChannel = (item: Channel, channels: Channel[] = []) => {
  if (!item || isNoticeChannel(item)) return false;
  if (item.type === 'news' || item.isNewsCategory === true) return true;
  if (item.path?.startsWith('/news?channel=')) return true;

  const byId = new Map(channels.map((channel) => [channel.id, channel]));
  const visited = new Set<string>();
  let parentId = item.parent || '';
  while (parentId && !visited.has(parentId)) {
    visited.add(parentId);
    const parent = byId.get(parentId);
    if (!parent || isNoticeChannel(parent)) return false;
    if (parent.type === 'news' || parent.isNewsCategory === true || parent.name === '新闻中心' || parent.slug === 'news-center') return true;
    parentId = parent.parent || '';
  }
  if (item.name === '新闻中心' || item.slug === 'news-center' || item.path === '/news' || item.path === '/news-center') return true;

  // 顶级栏目可能本身不是资讯类型，但其子树含资讯栏目（例如业务动态、党建群团）。
  const isDescendantOfItem = (candidate: Channel) => {
    const visited = new Set<string>();
    let parentId = candidate.parent || '';
    while (parentId && !visited.has(parentId)) {
      if (parentId === item.id) return true;
      visited.add(parentId);
      parentId = byId.get(parentId)?.parent || '';
    }
    return false;
  };

  return channels.some((candidate) => isDescendantOfItem(candidate)
    && !isNoticeChannel(candidate)
    && (candidate.type === 'news' || candidate.isNewsCategory === true));
};

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
    fields: 'id,name,slug,parent.id,type,path,sort,status,visible,is_news_category',
    limit: -1,
    sort: 'sort,id',
    'filter[status][_eq]': 'enabled',
    'filter[visible][_eq]': true,
  }));

  const items: Channel[] = (Array.isArray(channels?.data) ? channels.data : []).map((item) => ({
    id: String(item.id ?? ''),
    name: String(item.name ?? ''),
    slug: String(item.slug ?? ''),
    parent: item.parent && typeof item.parent === 'object' ? String((item.parent as Record<string, unknown>).id ?? '') : '',
    type: String(item.type ?? ''),
    path: String(item.path ?? ''),
    sort: Number(item.sort) || 0,
    status: String(item.status ?? ''),
    visible: item.visible !== false,
    isNewsCategory: item.type === 'news' || item.is_news_category === true,
  }));

  if (scope === 'notice') return items.filter(isNoticeChannel);
  if (scope === 'news') return items.filter((item) => isNewsChannel(item, items));
  return items;
}
