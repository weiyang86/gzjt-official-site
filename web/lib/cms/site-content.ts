import { buildDirectusAssetUrl, buildDirectusPath, cmsPublicAssetsAvailable, cmsPublicFetch } from './client';
import type { BusinessInnovation, BusinessInnovationCategory, BusinessSector, Company, DirectusListResponse, DownloadCategory, DownloadCenterData, DownloadResource, PageContent } from '@/types/cms';

const toText = (value: unknown) => typeof value === 'string' ? value : '';
const downloadCenterModuleCode = 'download-center';
const downloadCategoryItemType = 'download_category';
const downloadResourceItemType = 'download';

const toExtraJson = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }
  return {};
};

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

export const businessInnovationModuleCode = 'business-innovation';
const businessInnovationItemType = 'innovation';
const businessInnovationCategoryItemType = 'innovation_category';

export async function getPublicBusinessInnovationCategories() {
  const response = await cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/page_content_items', {
    'filter[module_code][_eq]': businessInnovationModuleCode,
    'filter[item_type][_eq]': businessInnovationCategoryItemType,
    'filter[status][_eq]': 'enabled',
    sort: 'sort,id',
    limit: -1,
    fields: 'id,title,subtitle,content,sort,status',
  }), { cache: 'no-store', next: { revalidate: false } });

  return (response.data || [])
    .map((item): BusinessInnovationCategory => ({
      id: String(item.id ?? ''),
      name: toText(item.title),
      slug: toText(item.subtitle),
      description: toText(item.content),
      sort: Number(item.sort) || 0,
      status: toText(item.status) || 'enabled',
    }))
    .filter((item) => Boolean(item.name && item.slug));
}

export async function getPublicBusinessInnovations(categories?: BusinessInnovationCategory[]) {
  const resolvedCategories = categories || await getPublicBusinessInnovationCategories();
  const categoryBySlug = new Map(resolvedCategories.map((item) => [item.slug, item]));
  const categoryByName = new Map(resolvedCategories.map((item) => [item.name, item]));
  const response = await cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/page_content_items', {
    'filter[module_code][_eq]': businessInnovationModuleCode,
    'filter[item_type][_eq]': businessInnovationItemType,
    'filter[status][_eq]': 'enabled',
    sort: 'sort,id',
    limit: -1,
    fields: 'id,title,subtitle,content,image,sort,status,extra_json',
  }), { cache: 'no-store', next: { revalidate: false } });

  return (response.data || [])
    .map((item): BusinessInnovation => {
      const extra = toExtraJson(item.extra_json);
      const legacyCategory = toText(extra.category);
      const categorySlug = toText(extra.category_slug) || categoryByName.get(legacyCategory)?.slug || '';
      return {
        id: String(item.id ?? ''),
        title: toText(item.title),
        summary: toText(item.subtitle),
        content: toText(item.content),
        image: buildDirectusAssetUrl(toText(item.image)),
        category: categoryBySlug.get(categorySlug)?.name || legacyCategory || '科技创新',
        categorySlug,
        slug: toText(extra.slug) || String(item.id ?? ''),
        sort: Number(item.sort) || 0,
      };
    })
    .filter((item) => Boolean(item.title));
}

export async function getPublicBusinessInnovationCenter() {
  const categories = await getPublicBusinessInnovationCategories();
  const items = await getPublicBusinessInnovations(categories);
  return { categories, items };
}

export async function getPublicDownloadCenter(): Promise<DownloadCenterData> {
  const [categoryResponse, resourceResponse] = await Promise.all([
    cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/page_content_items', {
      'filter[module_code][_eq]': downloadCenterModuleCode,
      'filter[item_type][_eq]': downloadCategoryItemType,
      'filter[status][_eq]': 'enabled',
      sort: 'sort,id',
      limit: -1,
      fields: 'id,module_code,item_type,title,subtitle,content,sort,status',
    }), { cache: 'no-store', next: { revalidate: false } }),
    cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/page_content_items', {
      'filter[module_code][_eq]': downloadCenterModuleCode,
      'filter[item_type][_eq]': downloadResourceItemType,
      'filter[status][_eq]': 'enabled',
      sort: 'sort,id',
      limit: -1,
      fields: 'id,module_code,item_type,title,subtitle,content,link_url,sort,status,extra_json',
    }), { cache: 'no-store', next: { revalidate: false } }),
  ]);

  const categories = (categoryResponse.data || [])
    .map((item): DownloadCategory => ({
      id: String(item.id ?? ''),
      name: toText(item.title),
      slug: toText(item.subtitle),
      description: toText(item.content),
      sort: Number(item.sort) || 0,
      status: toText(item.status) || 'enabled',
    }))
    .filter((item) => item.id && item.name && item.slug)
    .sort((left, right) => (Number(left.sort) - Number(right.sort)) || left.id.localeCompare(right.id));

  const categoryBySlug = new Map(categories.map((item) => [item.slug, item]));
  const resourceRows = resourceResponse.data || [];
  const availability = await cmsPublicAssetsAvailable(resourceRows.map((item) => toText(item.link_url)).filter(Boolean));
  const resources = resourceRows
    .map((item): DownloadResource => {
      const extra = toExtraJson(item.extra_json);
      const categorySlug = toText(item.subtitle);
      const fileId = toText(item.link_url);
      const fileAvailable = Boolean(fileId && availability[fileId]);
      return {
        id: String(item.id ?? ''),
        name: toText(item.title),
        description: toText(item.content),
        categorySlug,
        categoryName: categoryBySlug.get(categorySlug)?.name || '',
        fileId,
        fileUrl: fileAvailable ? buildDirectusAssetUrl(fileId) : '',
        fileAvailable,
        filename: toText(extra.filename) || toText(item.title) || '附件',
        filesize: Number(extra.filesize) || 0,
        fileType: toText(extra.fileType) || toText(extra.file_type),
        sort: Number(item.sort) || 0,
        status: toText(item.status) || 'enabled',
      };
    })
    // 分类停用或资料指向无效分类时，前台不展示，避免出现无归属资料。
    .filter((item) => Boolean(item.id && item.name && item.categorySlug && categoryBySlug.has(item.categorySlug)))
    .sort((left, right) => {
      const leftCategorySort = categoryBySlug.get(left.categorySlug)?.sort || 0;
      const rightCategorySort = categoryBySlug.get(right.categorySlug)?.sort || 0;
      return (Number(leftCategorySort) - Number(rightCategorySort))
        || (Number(left.sort) - Number(right.sort))
        || left.id.localeCompare(right.id);
    });

  return { categories, resources };
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

export async function getPublicGroupIntro() {
  const response = await cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/page_contents', {
    'filter[module_code][_eq]': 'group-intro',
    'filter[status][_eq]': 'published',
    limit: 1,
    fields: 'id,module_code,title,subtitle,cover,summary,content,extra_json,status',
  }), { cache: 'no-store', next: { revalidate: false } });
  const item = response.data?.[0];
  if (!item) return null;
  let extraJson = item.extra_json;
  if (typeof extraJson === 'string') {
    try { extraJson = JSON.parse(extraJson); } catch { extraJson = {}; }
  }
  return {
    id: String(item.id ?? ''),
    module_code: String(item.module_code ?? ''),
    title: toText(item.title),
    slug: 'about',
    subtitle: toText(item.subtitle),
    cover: buildDirectusAssetUrl(toText(item.cover)),
    summary: toText(item.summary),
    content: toText(item.content),
    extra_json: extraJson && typeof extraJson === 'object' && !Array.isArray(extraJson)
      ? extraJson as Record<string, unknown>
      : {},
    status: toText(item.status) as PageContent['status'],
  } satisfies PageContent;
}
