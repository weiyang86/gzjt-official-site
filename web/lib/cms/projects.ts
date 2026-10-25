import { buildDirectusAssetUrl, buildDirectusPath, cmsPublicFetch } from './client';
import { normalizeRichTextAssetUrls } from './articles';
import type { DirectusListResponse, Project } from '@/types/cms';

const projectModuleCode = 'project-list';
const projectItemType = 'project';
const projectBaseFields = 'id,module_code,item_type,title,subtitle,image,sort,status,extra_json';
const projectDetailFields = `${projectBaseFields},content`;

const toText = (value: unknown) => typeof value === 'string' ? value : '';

const readExtra = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
};

const toCoordinate = (value: unknown) => {
  if (value === '' || value === null || value === undefined) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

const mapProject = (item: Record<string, unknown>): Project => {
  const extra = readExtra(item.extra_json);
  return {
    id: String(item.id ?? ''),
    name: toText(item.title),
    type: toText(item.subtitle),
    location: toText(extra.location),
    summary: toText(extra.summary),
    progress: toText(extra.progress),
    image: buildDirectusAssetUrl(toText(item.image)),
    detail: normalizeRichTextAssetUrls(toText(item.content)),
    mapX: toCoordinate(extra.map_x),
    mapY: toCoordinate(extra.map_y),
    sort: Number(item.sort) || 0,
    status: toText(item.status) || 'enabled',
  };
};

const isVisibleProjectRow = (item: Record<string, unknown>) => (
  String(item.module_code || '') === projectModuleCode
  && String(item.item_type || '') === projectItemType
  && String(item.status || '') === 'enabled'
);

export async function getPublicProjects(): Promise<Project[]> {
  const response = await cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/page_content_items', {
    fields: projectBaseFields,
    limit: -1,
    sort: 'sort,id',
    'filter[module_code][_eq]': projectModuleCode,
    'filter[item_type][_eq]': projectItemType,
    'filter[status][_eq]': 'enabled',
  }));
  return (response.data || [])
    .map(mapProject)
    .filter((item) => item.id && item.name);
}

export async function getPublicProjectById(id: string): Promise<Project | null> {
  const projectId = String(id || '').trim();
  if (!projectId) return null;

  const response = await cmsPublicFetch<{ data?: Record<string, unknown> }>(
    buildDirectusPath(`/items/page_content_items/${encodeURIComponent(projectId)}`, { fields: projectDetailFields }),
    { cache: 'no-store' },
  );

  const item = response.data;
  if (!item || !isVisibleProjectRow(item)) return null;

  const project = mapProject(item);
  return project.id && project.name ? project : null;
}
