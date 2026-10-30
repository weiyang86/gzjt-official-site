import {
  purgeOldEvents,
  readEvents,
  readRetentionDays,
  shanghaiDate,
  type AnalyticsEvent,
} from './store';

export type AnalyticsDailyPoint = { date: string; pv: number; uv: number };
export type AnalyticsRankItem = { key: string; label: string; pv: number; uv: number; share: number };
export type AnalyticsDeviceItem = { key: string; label: string; count: number; share: number };
export type AnalyticsActionItem = { name: string; label: string; count: number };

export type AnalyticsReport = {
  summary: { days: number; pv: number; uv: number; todayPv: number; todayUv: number };
  daily: AnalyticsDailyPoint[];
  topPages: AnalyticsRankItem[];
  topReferrers: AnalyticsRankItem[];
  devices: AnalyticsDeviceItem[];
  actions: AnalyticsActionItem[];
  retentionDays: number;
  generatedAt: string;
};

export const analyticsMinDays = 1;
export const analyticsMaxDays = 90;

const pageLabels: Record<string, string> = {
  '/': '网站首页',
  '/home': '网站首页',
  '/about': '集团概况',
  '/group': '集团概况',
  '/news': '新闻中心',
  '/news-center': '新闻中心',
  '/disclosure': '信息公开',
  '/business-dev': '业务发展',
  '/business': '业务发展',
  '/business-dynamics': '业务动态',
  '/projects': '重点项目',
  '/org': '下属公司',
  '/clean-gov': '廉洁建投',
  '/social-responsibility': '社会责任',
  '/responsibility': '社会责任',
  '/contact-us': '联系我们',
  '/contact': '联系我们',
  '/party': '党群建设',
  '/party-masses': '党群建设',
  '/search': '站内搜索',
  '/news/:id': '新闻详情',
  '/org/:slug': '公司详情',
  '/pages/:slug': '专题页面',
};

const deviceLabels: Record<string, string> = {
  desktop: '电脑端',
  mobile: '移动端',
  tablet: '平板端',
};

const actionLabels: Record<string, string> = {
  search: '站内搜索',
  'tel-click': '举报电话点击',
  'mailto-click': '邮箱点击',
  download: '附件下载',
  'external-link': '外链点击',
};

export const clampAnalyticsDays = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 14;
  return Math.min(analyticsMaxDays, Math.max(analyticsMinDays, Math.round(numeric)));
};

const normalizePageKey = (value: string) => {
  const segments = value.split('/').filter(Boolean);
  if (!segments.length) return '/';
  const normalized = segments.map((segment) => {
    if (/^\d+$/.test(segment)) return ':id';
    if (/^[0-9a-f]{8}-[0-9a-f-]{20,}$/i.test(segment)) return ':id';
    return segment;
  });
  return `/${normalized.join('/')}`;
};

const pageLabelOf = (key: string) => pageLabels[key] || key;

const toDeviceKey = (value: string) => (value === 'mobile' || value === 'tablet' ? value : 'desktop');

const percent = (value: number, total: number) => (total > 0 ? Math.round((value / total) * 1000) / 10 : 0);

type Counter = { pv: number; visitors: Set<string> };

const addCount = (map: Map<string, Counter>, key: string, visitor: string) => {
  const current = map.get(key) || { pv: 0, visitors: new Set<string>() };
  current.pv += 1;
  current.visitors.add(visitor);
  map.set(key, current);
};

const toRanks = (map: Map<string, Counter>, total: number, label: (key: string) => string, limit = 10) => Array
  .from(map.entries())
  .map(([key, counter]) => ({
    key,
    label: label(key),
    pv: counter.pv,
    uv: counter.visitors.size,
    share: percent(counter.pv, total),
  }))
  .sort((left, right) => right.pv - left.pv || right.uv - left.uv || left.key.localeCompare(right.key))
  .slice(0, limit);

const eventDate = (event: AnalyticsEvent) => {
  const timestamp = Date.parse(event.t);
  return Number.isNaN(timestamp) ? '' : shanghaiDate(timestamp);
};

export async function buildAnalyticsReport(rawDays: unknown): Promise<AnalyticsReport> {
  const days = clampAnalyticsDays(rawDays);
  const retentionDays = await readRetentionDays();
  // 每次查看时顺带执行保留期清理，避免长期运行累积过多日文件。
  await purgeOldEvents(retentionDays);

  const events = await readEvents(days);
  const today = shanghaiDate();
  const pageViews = events.filter((event) => event.k === 'pageview');

  const daily = new Map<string, Counter>();
  const todayCounter: Counter = { pv: 0, visitors: new Set<string>() };
  const totalVisitors = new Set<string>();
  const pageCounter = new Map<string, Counter>();
  const referrerCounter = new Map<string, Counter>();
  const deviceCounter = new Map<string, number>();
  const actionCounter = new Map<string, number>();

  for (const event of pageViews) {
    const visitor = event.v || 'unknown';
    const date = eventDate(event) || today;
    addCount(daily, date, visitor);
    totalVisitors.add(visitor);
    addCount(pageCounter, normalizePageKey(event.p || '/'), visitor);
    addCount(referrerCounter, event.r || 'direct', visitor);
    const deviceKey = toDeviceKey(event.d);
    deviceCounter.set(deviceKey, (deviceCounter.get(deviceKey) || 0) + 1);
    if (date === today) {
      todayCounter.pv += 1;
      todayCounter.visitors.add(visitor);
    }
  }

  for (const event of events) {
    if (event.k !== 'event' || !event.n) continue;
    actionCounter.set(event.n, (actionCounter.get(event.n) || 0) + 1);
  }

  const dailyPoints: AnalyticsDailyPoint[] = [];
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = shanghaiDate(Date.now() - index * 86_400_000);
    const counter = daily.get(date);
    dailyPoints.push({ date, pv: counter?.pv || 0, uv: counter?.visitors.size || 0 });
  }

  const totalPv = pageViews.length;
  const referrerLabel = (key: string) => (key === 'direct' ? '直接访问' : key);
  const devices: AnalyticsDeviceItem[] = Object.entries(deviceLabels)
    .map(([key, label]) => ({
      key,
      label,
      count: deviceCounter.get(key) || 0,
      share: percent(deviceCounter.get(key) || 0, totalPv),
    }))
    .filter((item) => item.count > 0)
    .sort((left, right) => right.count - left.count);

  const actions: AnalyticsActionItem[] = Array.from(actionCounter.entries())
    .map(([name, count]) => ({ name, label: actionLabels[name] || name, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 10);

  return {
    summary: {
      days,
      pv: totalPv,
      uv: totalVisitors.size,
      todayPv: todayCounter.pv,
      todayUv: todayCounter.visitors.size,
    },
    daily: dailyPoints,
    topPages: toRanks(pageCounter, totalPv, pageLabelOf),
    topReferrers: toRanks(referrerCounter, totalPv, referrerLabel),
    devices,
    actions,
    retentionDays,
    generatedAt: new Date().toISOString(),
  };
}
