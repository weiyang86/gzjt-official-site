import { buildDirectusAssetUrl, buildDirectusPath, cmsPublicFetch } from './client';
import type { BusinessSector, Company, DirectusListResponse, PageContent } from '@/types/cms';

const toText = (value: unknown) => typeof value === 'string' ? value : '';

const mapCompany = (item: Record<string, unknown>): Company => ({
  id: String(item.id ?? ''),
  name: toText(item.name),
  shortName: toText(item.short_name),
  slug: toText(item.slug),
  logo: buildDirectusAssetUrl(toText(item.logo)),
  cover: buildDirectusAssetUrl(toText(item.cover)),
  intro: toText(item.intro),
  description: toText(item.intro),
  address: toText(item.address),
  mainBusiness: toText(item.main_business),
  registeredCapital: toText(item.registered_capital),
  status: toText(item.status),
});

export async function getPublicCompanies() {
  const response = await cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/companies', {
    'filter[status][_eq]': 'enabled',
    sort: 'sort,id',
    fields: 'id,name,short_name,slug,logo,cover,intro,address,main_business,registered_capital,sort,status',
  }));
  return (response.data || []).map(mapCompany);
}

export async function getPublicCompanyBySlug(slug: string) {
  const response = await cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/companies', {
    'filter[slug][_eq]': slug,
    'filter[status][_eq]': 'enabled',
    limit: 1,
    fields: 'id,name,short_name,slug,logo,cover,intro,address,main_business,registered_capital,sort,status',
  }));
  return response.data?.[0] ? mapCompany(response.data[0]) : null;
}

export async function getPublicBusinessSectors() {
  const response = await cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/business_sectors', {
    'filter[status][_eq]': 'enabled',
    sort: 'sort,id',
    fields: 'id,name,slug,cover,intro,sort,status',
  }));
  return (response.data || []).map((item): BusinessSector => ({
    id: String(item.id ?? ''),
    name: toText(item.name),
    title: toText(item.name),
    slug: toText(item.slug),
    cover: buildDirectusAssetUrl(toText(item.cover)),
    intro: toText(item.intro),
    description: toText(item.intro),
    status: toText(item.status) as BusinessSector['status'],
  }));
}

export async function getPublicPageBySlug(slug: string) {
  const response = await cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/pages', {
    'filter[slug][_eq]': slug,
    'filter[status][_eq]': 'published',
    limit: 1,
    fields: 'id,title,slug,cover,content,status',
  }));
  const item = response.data?.[0];
  if (!item) return null;
  return {
    id: String(item.id ?? ''),
    title: toText(item.title),
    slug: toText(item.slug),
    cover: buildDirectusAssetUrl(toText(item.cover)),
    content: toText(item.content),
    status: toText(item.status) as PageContent['status'],
  };
}
