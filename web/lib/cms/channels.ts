import { cmsFetch } from './client';
import type { Channel, DirectusListResponse } from '@/types/cms';

export async function getChannels(type?: string) {
  const params = new URLSearchParams({
    fields: 'id,name,slug,type',
    sort: 'sort,name',
  });

  if (type) params.set('filter[type][_eq]', type);

  return cmsFetch<DirectusListResponse<Channel>>(`/items/channels?${params.toString()}`);
}
