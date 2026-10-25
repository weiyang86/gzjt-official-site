export type ReportConfig = {
  enabled: boolean;
  title: string;
  intro: string;
  phone: string;
  email: string;
  address: string;
  onlineUrl: string;
  onlineLabel: string;
  notice: string;
  articleChannelSlug: string;
  articlePageSize: number;
};

export const reportConfigModuleCode = 'report-settings';

export const defaultReportChannelSlug = 'clean-governance';

export const defaultReportConfig: ReportConfig = {
  enabled: true,
  title: '举报入口',
  intro: '如发现集团及所属企业人员违纪违法问题，欢迎通过以下方式监督举报，举报内容将被严格保密。',
  phone: '',
  email: '',
  address: '',
  onlineUrl: '',
  onlineLabel: '前往在线举报',
  notice: '',
  articleChannelSlug: defaultReportChannelSlug,
  articlePageSize: 6,
};

const toText = (value: unknown, maxLength: number) => (
  typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
);

// 在线举报仅接受 http/https 地址，避免后台录入 javascript: 等可执行协议后被渲染为链接。
const toSafeUrl = (value: unknown) => {
  const raw = toText(value, 500);
  return /^https?:\/\//i.test(raw) ? raw : '';
};

const toEmail = (value: unknown) => {
  const raw = toText(value, 120);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw) ? raw : '';
};

const toChannelSlug = (value: unknown) => {
  const raw = toText(value, 60);
  return raw && /^[\w-]+$/.test(raw) ? raw : defaultReportChannelSlug;
};

const toPageSize = (value: unknown) => {
  const size = Number(value);
  if (!Number.isFinite(size)) return defaultReportConfig.articlePageSize;
  return Math.min(12, Math.max(3, Math.round(size)));
};

export const normalizeReportConfig = (value: unknown): ReportConfig => {
  const raw = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const source = raw.report && typeof raw.report === 'object' && !Array.isArray(raw.report)
    ? raw.report as Record<string, unknown>
    : raw;

  return {
    enabled: source.enabled !== false,
    title: toText(source.title, 40) || defaultReportConfig.title,
    intro: toText(source.intro, 300),
    phone: toText(source.phone, 120),
    email: toEmail(source.email),
    address: toText(source.address, 200),
    onlineUrl: toSafeUrl(source.onlineUrl),
    onlineLabel: toText(source.onlineLabel, 60) || defaultReportConfig.onlineLabel,
    notice: toText(source.notice, 2000),
    articleChannelSlug: toChannelSlug(source.articleChannelSlug),
    articlePageSize: toPageSize(source.articlePageSize),
  };
};
