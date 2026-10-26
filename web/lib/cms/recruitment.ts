import { buildDirectusPath, cmsPublicFetch } from './client';
import { normalizeRichTextAssetUrls } from './articles';
import type { DirectusListResponse, RecruitmentCategory, RecruitmentJob } from '@/types/cms';

const recruitmentModuleCode = 'recruitment';
const recruitmentItemType = 'job';
const jobBaseFields = 'id,module_code,item_type,title,subtitle,date_label,sort,status,extra_json';
const jobDetailFields = `${jobBaseFields},content,link_url`;

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

const toCategory = (value: unknown): RecruitmentCategory => {
  const category = toText(value);
  return category === 'campus' || category === 'internal' ? category : 'social';
};

const mapJob = (item: Record<string, unknown>): RecruitmentJob => {
  const extra = readExtra(item.extra_json);
  return {
    id: String(item.id ?? ''),
    title: toText(item.title),
    department: toText(item.subtitle),
    headcount: toText(extra.headcount),
    location: toText(extra.location),
    deadline: toText(item.date_label),
    requirement: normalizeRichTextAssetUrls(toText(item.content)),
    applyUrl: toText(item.link_url),
    category: toCategory(extra.category),
    sort: Number(item.sort) || 0,
    status: toText(item.status) || 'enabled',
  };
};

const isVisibleJobRow = (item: Record<string, unknown>) => (
  String(item.module_code || '') === recruitmentModuleCode
  && String(item.item_type || '') === recruitmentItemType
  && String(item.status || '') === 'enabled'
);

export async function getPublicRecruitmentJobs(): Promise<RecruitmentJob[]> {
  const response = await cmsPublicFetch<DirectusListResponse<Record<string, unknown>>>(buildDirectusPath('/items/page_content_items', {
    fields: jobBaseFields,
    limit: -1,
    sort: 'sort,id',
    'filter[module_code][_eq]': recruitmentModuleCode,
    'filter[item_type][_eq]': recruitmentItemType,
    'filter[status][_eq]': 'enabled',
  }));
  return (response.data || [])
    .map(mapJob)
    .filter((item) => item.id && item.title);
}

export async function getPublicRecruitmentJobById(id: string): Promise<RecruitmentJob | null> {
  const jobId = String(id || '').trim();
  if (!jobId) return null;

  const response = await cmsPublicFetch<{ data?: Record<string, unknown> }>(
    buildDirectusPath(`/items/page_content_items/${encodeURIComponent(jobId)}`, { fields: jobDetailFields }),
    { cache: 'no-store' },
  );

  const item = response.data;
  if (!item || !isVisibleJobRow(item)) return null;

  const job = mapJob(item);
  return job.id && job.title ? job : null;
}
