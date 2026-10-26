import type { MessageCategory, MessageStatus, SiteMessage } from '@/types/cms';

export const messageModuleCode = 'site-message';

export const messageCategoryOptions: Array<{ value: MessageCategory; label: string }> = [
  { value: 'consult', label: '咨询' },
  { value: 'suggest', label: '建议' },
  { value: 'complaint', label: '投诉' },
  { value: 'report', label: '举报' },
  { value: 'other', label: '其他' },
];

export const messageStatusOptions: Array<{ value: MessageStatus; label: string }> = [
  { value: 'pending', label: '待受理' },
  { value: 'processing', label: '处理中' },
  { value: 'replied', label: '已回复' },
  { value: 'closed', label: '已办结' },
];

export const messageCategoryLabel = (value?: string) => (
  messageCategoryOptions.find((option) => option.value === value)?.label || '未分类'
);

export const messageStatusLabel = (value?: string) => (
  messageStatusOptions.find((option) => option.value === value)?.label || '待受理'
);

export const isMessageCategory = (value: unknown): value is MessageCategory => (
  typeof value === 'string' && messageCategoryOptions.some((option) => option.value === value)
);

export const isMessageStatus = (value: unknown): value is MessageStatus => (
  typeof value === 'string' && messageStatusOptions.some((option) => option.value === value)
);

export const phonePattern = /^1[3-9]\d{9}$/;
export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const messageLimits = {
  name: 30,
  email: 100,
  content: 2000,
  minContent: 10,
  reply: 1000,
  note: 500,
};

export type MessageFormInput = {
  name: string;
  phone: string;
  email: string;
  category: MessageCategory;
  content: string;
  website?: string;
  elapsed_ms?: number;
  source_path?: string;
};

export const normalizeMessageText = (value: unknown) => (
  typeof value === 'string' ? value.replace(/\r\n/g, '\n').trim() : ''
);

export const validateMessageForm = (input: MessageFormInput): string => {
  const name = normalizeMessageText(input.name);
  const phone = normalizeMessageText(input.phone);
  const email = normalizeMessageText(input.email);
  const content = normalizeMessageText(input.content);

  if (name.length < 2 || name.length > messageLimits.name) return `姓名需填写 2-${messageLimits.name} 个字符。`;
  if (!phonePattern.test(phone)) return '请填写正确的 11 位手机号码。';
  if (email && (email.length > messageLimits.email || !emailPattern.test(email))) return '请填写正确的电子邮箱。';
  if (!isMessageCategory(input.category)) return '请选择留言类型。';
  if (content.length < messageLimits.minContent || content.length > messageLimits.content) {
    return `留言内容需填写 ${messageLimits.minContent}-${messageLimits.content} 个字符。`;
  }
  return '';
};

export const validateMessageReply = (status: MessageStatus, reply: string, note: string): string => {
  if (status === 'replied' && !normalizeMessageText(reply)) return '状态改为已回复时必须填写公开回复。';
  if (normalizeMessageText(reply).length > messageLimits.reply) return `公开回复不能超过 ${messageLimits.reply} 个字符。`;
  if (normalizeMessageText(note).length > messageLimits.note) return `内部备注不能超过 ${messageLimits.note} 个字符。`;
  return '';
};

export const maskPhone = (phone?: string) => {
  const value = String(phone || '');
  if (value.length !== 11) return value || '-';
  return `${value.slice(0, 3)}****${value.slice(7)}`;
};

export const messageExcerpt = (content?: string, length = 60) => {
  const value = normalizeMessageText(content).replace(/\s+/g, ' ');
  return value.length > length ? `${value.slice(0, length)}…` : value;
};

export const formatMessageDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (number: number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const buildTrackCode = (seed?: () => number) => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const random = seed || Math.random;
  let code = '';
  for (let index = 0; index < 8; index += 1) {
    code += alphabet[Math.floor(random() * alphabet.length)];
  }
  return code;
};

export const messageStatusTone = (status: MessageStatus) => {
  if (status === 'pending') return { background: 'rgba(191, 120, 32, .12)', color: '#92500b' };
  if (status === 'processing') return { background: 'rgba(13, 79, 137, .12)', color: '#0d4f89' };
  if (status === 'replied') return { background: 'rgba(31, 122, 79, .12)', color: '#1f7a4f' };
  return { background: 'rgba(84, 96, 112, .12)', color: '#546070' };
};

export const mapMessageRow = (row: Record<string, unknown>): SiteMessage => {
  const extra = (() => {
    const value = row.extra_json;
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
  })();
  const text = (value: unknown) => (typeof value === 'string' ? value : '');
  return {
    id: String(row.id || ''),
    name: text(extra.name),
    phone: text(extra.phone),
    email: text(extra.email),
    category: isMessageCategory(extra.category) ? extra.category : 'other',
    content: text(row.content),
    status: isMessageStatus(extra.status) ? extra.status : 'pending',
    reply: text(extra.reply),
    note: text(extra.note),
    handler: text(extra.handler),
    handledAt: text(extra.handled_at),
    trackCode: text(extra.track_code),
    clientIp: text(extra.client_ip),
    sourcePath: text(extra.source_path),
    createdAt: text(extra.created_at),
  };
};
