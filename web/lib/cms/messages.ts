import { buildDirectusPath, cmsPublicFetch } from './client';
import {
  buildTrackCode,
  mapMessageRow,
  messageCategoryLabel,
  messageModuleCode,
  normalizeMessageText,
} from '@/lib/messages/shared';
import type { SiteMessage } from '@/types/cms';

type PageContentRow = Record<string, unknown> & { id?: string };

const messageFields = 'id,module_code,title,subtitle,summary,content,extra_json,status';

const messageListPath = () => buildDirectusPath('/items/page_contents', {
  fields: messageFields,
  limit: -1,
  'filter[module_code][_eq]': messageModuleCode,
});

const readRows = async (): Promise<PageContentRow[]> => {
  const response = await cmsPublicFetch<{ data?: PageContentRow[] }>(messageListPath());
  return Array.isArray(response.data) ? response.data : [];
};

export const listSiteMessages = async (): Promise<SiteMessage[]> => (
  (await readRows())
    .map((row) => mapMessageRow(row))
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))
);

const compactTimestamp = (value: Date) => {
  const pad = (number: number) => String(number).padStart(2, '0');
  return `${value.getFullYear()}${pad(value.getMonth() + 1)}${pad(value.getDate())}${pad(value.getHours())}${pad(value.getMinutes())}`;
};

export type CreateSiteMessageInput = {
  name: string;
  phone: string;
  email: string;
  category: SiteMessage['category'];
  content: string;
  clientIp: string;
  sourcePath: string;
};

export const createSiteMessage = async (input: CreateSiteMessageInput): Promise<SiteMessage> => {
  const now = new Date();
  const existingCodes = new Set((await readRows()).map((row) => mapMessageRow(row).trackCode).filter(Boolean));
  const trackCode = (() => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const code = buildTrackCode();
      if (!existingCodes.has(code)) return code;
    }
    // 极小概率连续冲突时补足随机位，避免写入重复查询码。
    return `${buildTrackCode()}${buildTrackCode()}`.slice(0, 12);
  })();
  const content = normalizeMessageText(input.content);
  const payload = {
    module_code: messageModuleCode,
    title: `${normalizeMessageText(input.name)}-${compactTimestamp(now)}`,
    subtitle: messageCategoryLabel(input.category),
    summary: content.slice(0, 60),
    cover: '',
    content,
    status: 'draft',
    extra_json: {
      name: normalizeMessageText(input.name),
      phone: normalizeMessageText(input.phone),
      email: normalizeMessageText(input.email),
      category: input.category,
      status: 'pending',
      reply: '',
      note: '',
      handler: '',
      handled_at: '',
      track_code: trackCode,
      client_ip: input.clientIp,
      source_path: input.sourcePath,
      created_at: now.toISOString(),
    },
  };
  const response = await cmsPublicFetch<{ data?: PageContentRow }>('/items/page_contents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.data) throw Object.assign(new Error('留言保存失败'), { status: 502 });
  return mapMessageRow({ ...response.data, content: response.data.content || content });
};

export const findDuplicateMessage = (
  messages: SiteMessage[],
  phone: string,
  content: string,
  windowMs = 10 * 60 * 1000,
) => {
  const normalizedContent = normalizeMessageText(content).replace(/\s+/g, ' ');
  const deadline = Date.now() - windowMs;
  return messages.some((message) => {
    if (message.phone !== phone) return false;
    if (message.content.replace(/\s+/g, ' ') !== normalizedContent) return false;
    const created = new Date(message.createdAt).getTime();
    return Number.isFinite(created) && created >= deadline;
  });
};

export const findMessageByTrackCode = (
  messages: SiteMessage[],
  trackCode: string,
  phoneTail: string,
) => {
  const code = normalizeMessageText(trackCode).toUpperCase();
  const tail = normalizeMessageText(phoneTail);
  return messages.find((message) => (
    message.trackCode.toUpperCase() === code
    && message.phone.slice(-4) === tail
  )) || null;
};
