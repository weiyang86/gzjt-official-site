import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export type AnalyticsEventKind = 'pageview' | 'event';

export type AnalyticsEvent = {
  /** 事件时间，ISO 字符串 */
  t: string;
  /** p 表示页面浏览，e 表示关键行为 */
  k: AnalyticsEventKind;
  /** 页面路径，已去除查询参数 */
  p: string;
  /** 访客标识哈希，仅保留当日可关联的匿名值 */
  v: string;
  /** 来源站点域名，空字符串表示直接访问 */
  r: string;
  /** 设备类型：desktop / mobile / tablet */
  d: string;
  /** 关键行为名称 */
  n?: string;
  /** 关键行为附加信息 */
  x?: string;
};

export const defaultRetentionDays = 90;
export const minRetentionDays = 7;
export const maxRetentionDays = 365;

const eventFilePattern = /^events-(\d{4}-\d{2}-\d{2})\.ndjson$/;
const settingsFileName = 'settings.json';

const dataDir = () => process.env.ANALYTICS_DATA_DIR || path.resolve(process.cwd(), '.data/analytics');
const settingsPath = () => path.join(dataDir(), settingsFileName);
const eventsPath = (date: string) => path.join(dataDir(), `events-${date}.ndjson`);

/** 统计口径按北京时间切分自然日，避免与服务器时区不一致。 */
export const shanghaiDate = (timestamp = Date.now()) => new Date(timestamp + 8 * 3600_000).toISOString().slice(0, 10);

export const clampRetentionDays = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return defaultRetentionDays;
  return Math.min(maxRetentionDays, Math.max(minRetentionDays, Math.round(numeric)));
};

/** 访客标识只以加盐哈希形式落盘，原始标识与 IP 均不保存。 */
export const hashVisitor = (visitorId: string) => crypto
  .createHash('sha256')
  .update(`${visitorId}|${process.env.ANALYTICS_HASH_SALT || 'gzjt-site-analytics'}`)
  .digest('hex')
  .slice(0, 16);

export async function appendEvent(event: AnalyticsEvent) {
  const date = shanghaiDate();
  await fs.mkdir(dataDir(), { recursive: true });
  await fs.appendFile(eventsPath(date), `${JSON.stringify(event)}\n`, 'utf8');
}

export async function readEvents(days: number): Promise<AnalyticsEvent[]> {
  const wanted = new Set<string>();
  const now = Date.now();
  for (let index = 0; index < days; index += 1) wanted.add(shanghaiDate(now - index * 86_400_000));

  let names: string[];
  try {
    names = await fs.readdir(dataDir());
  } catch {
    return [];
  }

  const events: AnalyticsEvent[] = [];
  for (const name of names) {
    const matched = name.match(eventFilePattern);
    if (!matched || !wanted.has(matched[1])) continue;
    const content = await fs.readFile(path.join(dataDir(), name), 'utf8').catch(() => '');
    for (const line of content.split('\n')) {
      if (!line.trim()) continue;
      try {
        events.push(JSON.parse(line) as AnalyticsEvent);
      } catch {
        // 单行损坏时跳过，不影响其它记录
      }
    }
  }
  return events;
}

export async function readRetentionDays(): Promise<number> {
  try {
    const raw = await fs.readFile(settingsPath(), 'utf8');
    const parsed = JSON.parse(raw) as { retentionDays?: unknown };
    return clampRetentionDays(parsed.retentionDays);
  } catch {
    return defaultRetentionDays;
  }
}

export async function writeRetentionDays(value: unknown): Promise<number> {
  const retentionDays = clampRetentionDays(value);
  await fs.mkdir(dataDir(), { recursive: true });
  await fs.writeFile(settingsPath(), `${JSON.stringify({ retentionDays }, null, 2)}\n`, 'utf8');
  return retentionDays;
}

/** 删除保留期之外的日文件，返回删除的文件数。 */
export async function purgeOldEvents(retentionDays: number): Promise<number> {
  const cutoff = shanghaiDate(Date.now() - retentionDays * 86_400_000);
  let names: string[];
  try {
    names = await fs.readdir(dataDir());
  } catch {
    return 0;
  }
  let removed = 0;
  for (const name of names) {
    const matched = name.match(eventFilePattern);
    if (!matched || matched[1] >= cutoff) continue;
    await fs.unlink(path.join(dataDir(), name)).catch(() => undefined);
    removed += 1;
  }
  return removed;
}
