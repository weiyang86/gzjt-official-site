import fs from 'node:fs/promises';
import path from 'node:path';

/** 审核与发布人员信息仅在后台填写、用于数据导出，不在前台展示。 */
export type ArticleReviewMeta = {
  firstReviewer: string;
  secondReviewer: string;
  thirdReviewer: string;
  publisher: string;
};

type MetaFile = Record<string, ArticleReviewMeta>;

const dataDir = () => process.env.ARTICLE_META_DIR || path.resolve(process.cwd(), '.data/article-meta');
const metaPath = () => path.join(dataDir(), 'meta.json');
const idPattern = /^[A-Za-z0-9_-]{6,64}$/;

let writeQueue: Promise<unknown> = Promise.resolve();

const emptyMeta = (): ArticleReviewMeta => ({
  firstReviewer: '',
  secondReviewer: '',
  thirdReviewer: '',
  publisher: '',
});

const normalizeMeta = (value: unknown): ArticleReviewMeta => {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const pick = (key: keyof ArticleReviewMeta) => (typeof source[key] === 'string' ? String(source[key]).trim().slice(0, 64) : '');
  return {
    firstReviewer: pick('firstReviewer'),
    secondReviewer: pick('secondReviewer'),
    thirdReviewer: pick('thirdReviewer'),
    publisher: pick('publisher'),
  };
};

/** 每次都读文件，避免 Node 多入口各自缓存导致数据被覆盖。 */
async function load(): Promise<MetaFile> {
  try {
    const parsed = JSON.parse(await fs.readFile(metaPath(), 'utf8')) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(parsed).map(([id, value]) => [id, normalizeMeta(value)]));
  } catch {
    return {};
  }
}

async function persist(data: MetaFile) {
  await fs.mkdir(dataDir(), { recursive: true });
  const temp = `${metaPath()}.${process.pid}.tmp`;
  await fs.writeFile(temp, `${JSON.stringify(data)}\n`, 'utf8');
  await fs.rename(temp, metaPath());
}

export async function getArticleMeta(id: string): Promise<ArticleReviewMeta> {
  const key = String(id || '').trim();
  if (!idPattern.test(key)) return emptyMeta();
  const data = await load();
  return data[key] || emptyMeta();
}

export async function getAllArticleMeta(): Promise<Record<string, ArticleReviewMeta>> {
  return load();
}

export async function saveArticleMeta(id: string, input: unknown): Promise<ArticleReviewMeta> {
  const key = String(id || '').trim();
  if (!idPattern.test(key)) throw Object.assign(new Error('文章 ID 无效'), { status: 400 });
  const next = normalizeMeta(input);
  writeQueue = writeQueue
    .then(async () => {
      const data = await load();
      data[key] = next;
      await persist(data);
    })
    .catch(() => undefined);
  await writeQueue;
  return next;
}
