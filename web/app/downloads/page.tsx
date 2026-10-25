import { getPublicDownloadCenter } from '@/lib/cms';
import type { DownloadCategory, DownloadResource } from '@/types/cms';
import { Breadcrumb, Hero, Shell } from '../site-pages';
import styles from './downloads.module.css';

export const dynamic = 'force-dynamic';

type DownloadCenterPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const firstParam = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] || '' : value || '';

const formatFileSize = (bytes?: number) => {
  const value = Number(bytes) || 0;
  if (value <= 0) return '';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const fileTypeLabel = (resource: DownloadResource) => {
  const filename = resource.filename || '';
  const extension = filename.includes('.') ? filename.split('.').pop()?.toUpperCase() : '';
  if (extension && extension.length <= 6) return extension;
  if (resource.fileType) return resource.fileType.split('/').pop()?.toUpperCase() || '附件';
  return '附件';
};

function DownloadCard({ resource }: { resource: DownloadResource }) {
  const size = formatFileSize(resource.filesize);
  return (
    <article className={styles.downloadCard}>
      <div>
        <div className={styles.downloadTop}>
          <span className="pill">{resource.categoryName || '资料'}</span>
          <span className={styles.fileType}>{fileTypeLabel(resource)}</span>
        </div>
        <h3>{resource.name}</h3>
        <p className={styles.downloadDescription}>{resource.description || '暂无资料说明。'}</p>
        <div className={styles.downloadMeta}>
          <span>附件：{resource.filename || '未命名附件'}</span>
          {size ? <span>大小：{size}</span> : null}
        </div>
      </div>
      <div className={styles.downloadAction}>
        {resource.fileUrl
          ? <a className="btn btn--primary" href={resource.fileUrl} download={resource.filename || undefined}>下载附件</a>
          : <span className={styles.unavailable}>附件暂不可用</span>}
      </div>
    </article>
  );
}

function CategoryBar({ categories, resources, activeCategory }: {
  categories: DownloadCategory[];
  resources: DownloadResource[];
  activeCategory?: DownloadCategory;
}) {
  const countFor = (slug: string) => resources.filter((item) => item.categorySlug === slug).length;
  return (
    <nav className={styles.categoryBar} aria-label="资料分类">
      <a className={`${styles.categoryLink}${activeCategory ? '' : ` ${styles.categoryLinkActive}`}`.trim()} href="/downloads">
        全部资料 <span>{resources.length}</span>
      </a>
      {categories.map((category) => (
        <a
          className={`${styles.categoryLink}${activeCategory?.slug === category.slug ? ` ${styles.categoryLinkActive}` : ''}`.trim()}
          href={`/downloads?category=${encodeURIComponent(category.slug)}`}
          key={category.id}
        >
          {category.name} <span>{countFor(category.slug)}</span>
        </a>
      ))}
    </nav>
  );
}

export default async function DownloadCenterPage({ searchParams }: DownloadCenterPageProps) {
  const params = await searchParams;
  const requestedCategory = firstParam(params.category);
  let categories: DownloadCategory[] = [];
  let resources: DownloadResource[] = [];
  let hasLoadError = false;

  try {
    const data = await getPublicDownloadCenter();
    categories = data.categories;
    resources = data.resources;
  } catch {
    hasLoadError = true;
  }

  const activeCategory = requestedCategory
    ? categories.find((category) => category.slug === requestedCategory)
    : undefined;
  const visibleResources = activeCategory
    ? resources.filter((resource) => resource.categorySlug === activeCategory.slug)
    : resources;

  return (
    <Shell active="downloads" actionHref="/contact-us" actionLabel="联系我们">
      <Breadcrumb title="资料下载" />
      <main className="page" aria-label="资料下载中心">
        <Hero
          title="资料下载"
          kicker="DOWNLOAD CENTER"
          subtitle="集中提供集团公开文件、政策资料及相关附件，按分类浏览并下载。"
          cover="/img/雅砻江大桥.jpg"
          ctaHref="#downloads"
          ctaLabel="浏览资料"
          stats={[
            { value: String(resources.length), label: '可下载资料' },
            { value: String(categories.length), label: '资料分类' },
          ]}
        />

        <section className="section" id="downloads" aria-label="资料下载列表">
          <div className="content">
            <div className="section-head reveal is-visible">
              <div>
                <div className="kicker"><i aria-hidden="true" /><span>DOWNLOAD CENTER</span></div>
                <h2 className="h2">资料下载中心</h2>
                <p className="lead">按分类筛选公开资料，查看文件说明后直接下载附件。</p>
              </div>
            </div>

            <CategoryBar categories={categories} resources={resources} activeCategory={activeCategory} />
            {activeCategory?.description ? <p className={styles.categoryIntro}>{activeCategory.description}</p> : null}

            {hasLoadError ? (
              <div className={styles.emptyState} role="status">资料下载暂时无法加载，请稍后再试。</div>
            ) : visibleResources.length ? (
              <div className={styles.downloadList}>
                {visibleResources.map((resource) => <DownloadCard resource={resource} key={resource.id} />)}
              </div>
            ) : (
              <div className={styles.emptyState}>
                {activeCategory ? '该分类下暂无已发布的资料，敬请关注。' : '暂无已发布的资料，敬请关注。'}
              </div>
            )}
          </div>
        </section>
      </main>
    </Shell>
  );
}
