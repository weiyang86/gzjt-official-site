import { buildDirectusPath, cmsPublicFetch } from './client';
import type { DirectusListResponse, FriendLink } from '@/types/cms';

const mapLink = (item: Record<string, unknown>): FriendLink => ({
  id: String(item.id ?? ''),
  title: typeof item.title === 'string' ? item.title : '',
  url: typeof item.url === 'string' ? item.url : '',
  position: typeof item.position === 'string' ? item.position : '',
  sort: Number(item.sort) || 0,
});

export async function getPublicFriendLinks() {
  try {
    const response = await cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/friend_links', {
      'filter[status][_eq]': 'enabled',
      sort: 'sort,id',
      limit: -1,
      fields: 'id,title,url,position,sort,status',
    }));
    return (response.data || []).map(mapLink).filter((item) => item.title && item.url);
  } catch {
    return [];
  }
}
