import fs from 'node:fs/promises';
import path from 'node:path';

/** 文章统计只保存在服务端本地目录，不写入 CMS 数据源。 */
export type ArticleStatKind = 'views' | 'clicks';
export type ArticleStat = { views: number; clicks: number };

type StatsFile = {
  views: Record<string, number>;
  clicks: Record<string, number>;
};

const dataDir = () => process.env.ARTICLE_STATS_DIR || path.resolve(process.cwd(), '.data/article-stats');
const statsPath = () => path.join(dataDir(), 'stats.json');
const idPattern = /^[A-Za-z0-9_-]{6,64}$/;

const nonNegativeEnv = (key: string, fallback: number) => {
  const value = Number(process.env[key]);
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
};

/** 展示基数：真实计数从 0 开始，读取时按每篇文章叠加，让后台数据更接近真实运营体量。 */
export const ARTICLE_VIEW_BASE = nonNegativeEnv('ARTICLE_VIEW_BASE', 100);
export const ARTICLE_CLICK_BASE = nonNegativeEnv('ARTICLE_CLICK_BASE', 60);

let writeQueue: Promise<unknown> = Promise.resolve();

const emptyFile = (): StatsFile => ({ views: {}, clicks: {} });

/** 每次都读文件，避免 Node 多入口各自缓存导致计数被覆盖。 */
async function load(): Promise<StatsFile> {
  try {
    const parsed = JSON.parse(await fs.readFile(statsPath(), 'utf8')) as Partial<StatsFile>;
    return {
      views: parsed.views && typeof parsed.views === 'object' ? { ...parsed.views } : {},
      clicks: parsed.clicks && typeof parsed.clicks === 'object' ? { ...parsed.clicks } : {},
    };
  } catch {
    return emptyFile();
  }
}

async function persist(data: StatsFile) {
  await fs.mkdir(dataDir(), { recursive: true });
  const temp = `${statsPath()}.${process.pid}.tmp`;
  await fs.writeFile(temp, `${JSON.stringify(data)}\n`, 'utf8');
  await fs.rename(temp, statsPath());
}

/** 阅读量（详情页浏览）与点击量（列表/推荐位点击）累计计数。 */
export async function recordArticleStat(id: string, kind: ArticleStatKind): Promise<void> {
  const key = String(id || '').trim();
  if (!idPattern.test(key)) return;
  writeQueue = writeQueue
    .then(async () => {
      const data = await load();
      data[kind][key] = (data[kind][key] || 0) + 1;
      await persist(data);
    })
    .catch(() => undefined);
  await writeQueue;
}

/** 给单篇文章的统计叠加展示基数，未产生过真实统计的文章也返回基数。 */
export const withArticleStatBase = (stat?: Partial<ArticleStat> | null): ArticleStat => ({
  views: ARTICLE_VIEW_BASE + Number(stat?.views || 0),
  clicks: ARTICLE_CLICK_BASE + Number(stat?.clicks || 0),
});

export async function getAllArticleStats(): Promise<Record<string, ArticleStat>> {
  const data = await load();
  const result: Record<string, ArticleStat> = {};
  const ids = new Set([...Object.keys(data.views), ...Object.keys(data.clicks)]);
  ids.forEach((id) => {
    result[id] = { views: Number(data.views[id] || 0), clicks: Number(data.clicks[id] || 0) };
  });
  return result;
}

export async function sumArticleStats(ids: Iterable<string>): Promise<{ views: number; clicks: number }> {
  const data = await load();
  const list = Array.from(ids);
  return {
    views: list.reduce((total, id) => total + ARTICLE_VIEW_BASE + Number(data.views[id] || 0), 0),
    clicks: list.reduce((total, id) => total + ARTICLE_CLICK_BASE + Number(data.clicks[id] || 0), 0),
  };
}
