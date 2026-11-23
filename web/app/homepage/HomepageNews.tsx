'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Article } from '@/types/cms';
import styles from './HomepageNews.module.css';

type Props = { articles: Article[]; limit: number; interval: number; active: boolean; title: string };
const href = (article: Article) => `/news/${encodeURIComponent(article.id)}`;
const channel = (article: Article) => article.mainChannel || article.main_channel;
const groupName = (article: Article) => channel(article)?.name || '集团新闻';
const categoryName = (article: Article) => groupName(article).trim();
const dateText = (article: Article) => (article.publishAt || article.publishDate || '').slice(0, 10);
/** 首页新闻固定展示的三个分类，不随数据分布增减。 */
const FIXED_CATEGORIES = ['全部', '招投标公示', '集团要闻'] as const;
const NEWS_CATEGORIES = ['招投标公示', '集团要闻'] as const;

export default function HomepageNews({ articles, limit, interval, active, title }: Props) {
  const items = articles;
  /**
   * “全部”按分类均衡抽取，避免招投标公告集中发布时与“招投标公示”列表完全重复。
   * 先每类取相同数量，再按原始首页排序补齐，最后恢复排序。
   */
  const featuredItems = useMemo(() => {
    const take = Math.max(1, Math.ceil(limit / NEWS_CATEGORIES.length));
    const picked: Article[] = [];
    const pickedIds = new Set<string>();
    for (const name of NEWS_CATEGORIES) {
      for (const item of items.filter((entry) => categoryName(entry) === name).slice(0, take)) {
        if (pickedIds.has(item.id)) continue;
        pickedIds.add(item.id);
        picked.push(item);
      }
    }
    if (picked.length < limit) {
      for (const item of items) {
        if (picked.length >= limit) break;
        if (pickedIds.has(item.id)) continue;
        pickedIds.add(item.id);
        picked.push(item);
      }
    }
    const rank = new Map(items.map((item, index) => [item.id, index]));
    return picked.sort((left, right) => (rank.get(left.id) ?? 0) - (rank.get(right.id) ?? 0)).slice(0, limit);
  }, [items, limit]);
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const [loaded, setLoaded] = useState<Set<string>>(() => new Set());
  const [selected, setSelected] = useState('');
  const [category, setCategory] = useState('全部');
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [hidden, setHidden] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const suppressClickUntil = useRef(0);
  const imageCache = useRef(new Map<string, boolean>());
  const candidates = useMemo(() => items.filter((item) => item.cover), [items]);
  const slides = useMemo(() => candidates.filter((item) => item.cover && loaded.has(item.cover) && !failed.has(item.cover)).slice(0, 3), [candidates, loaded, failed]);
  const current = slides.find((item) => item.id === selected) || slides[0];
  const index = current ? slides.findIndex((item) => item.id === current.id) : 0;
  const visibleItems = category === '全部'
    ? featuredItems
    : items.filter((item) => categoryName(item) === category).slice(0, limit);
  const stopped = paused || hovered || focused || reduced || hidden || !active;
  const selectOffset = (offset: number) => {
    if (slides.length > 1) setSelected(slides[(index + offset + slides.length) % slides.length].id);
  };

  // Load at most three valid covers, only while this screen is active. Continue
  // past failed covers without fetching every large original on the hero screen.
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let confirmed = 0;
    const probes: HTMLImageElement[] = [];
    const probe = (candidateIndex: number) => {
      if (cancelled || confirmed >= 3 || candidateIndex >= candidates.length) return;
      const source = candidates[candidateIndex].cover || '';
      const cached = imageCache.current.get(source);
      if (cached !== undefined) {
        if (cached) confirmed += 1;
        probe(candidateIndex + 1);
        return;
      }
      const image = new Image();
      probes.push(image);
      let settled = false;
      const settle = (valid: boolean) => {
        if (cancelled || settled) return;
        settled = true;
        image.onload = null; image.onerror = null;
        imageCache.current.set(source, valid);
        if (valid) { confirmed += 1; setLoaded((previous) => new Set(previous).add(source)); }
        else setFailed((previous) => new Set(previous).add(source));
        probe(candidateIndex + 1);
      };
      image.onload = () => settle(true);
      image.onerror = () => settle(false);
      image.src = source;
      if (image.complete) settle(Boolean(image.naturalWidth));
    };
    probe(0);
    return () => { cancelled = true; probes.forEach((image) => { image.onload = null; image.onerror = null; }); };
  }, [active, candidates]);

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    const visibility = () => setHidden(document.hidden);
    update(); visibility();
    media.addEventListener('change', update);
    document.addEventListener('visibilitychange', visibility);
    return () => { media.removeEventListener('change', update); document.removeEventListener('visibilitychange', visibility); };
  }, []);

  useEffect(() => {
    if (stopped || slides.length < 2) return;
    const timer = window.setTimeout(() => setSelected(slides[(index + 1) % slides.length].id), Math.max(2000, Math.min(interval, 20000)));
    return () => window.clearTimeout(timer);
  }, [stopped, slides, index, interval]);

  return <div className={styles.layout}>
    <div className={styles.carousel} role="region" aria-roledescription="轮播" aria-label={`${title}图片新闻`}
      data-news-carousel data-paused={stopped} data-slide-id={current?.id || ''}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}
      onKeyDown={(event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault(); event.stopPropagation(); selectOffset(event.key === 'ArrowLeft' ? -1 : 1);
      }}>
      {current ? <figure className={styles.figure} data-news-enter>
        <a className={styles.imageLink} href={href(current)} aria-label={`查看图片新闻：${current.title}`}
          onTouchStart={(event) => { suppressClickUntil.current = 0; const t = event.touches[0]; touchStart.current = t ? { x: t.clientX, y: t.clientY } : null; }}
          onTouchEnd={(event) => {
            const from = touchStart.current; const to = event.changedTouches[0]; touchStart.current = null;
            if (!from || !to) return;
            const dx = to.clientX - from.x, dy = to.clientY - from.y;
            if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.3) {
              suppressClickUntil.current = performance.now() + 600; selectOffset(dx < 0 ? 1 : -1);
            }
          }}
          onClick={(event) => { if (event.detail !== 0 && performance.now() < suppressClickUntil.current) event.preventDefault(); suppressClickUntil.current = 0; }}>
          <img key={current.cover} className={styles.image} src={current.cover || ''} alt="" draggable={false}
            onError={() => { const cover = current.cover; if (cover) setFailed((previous) => new Set(previous).add(cover)); }} />
        </a>
        <figcaption className={styles.caption} aria-live={stopped ? 'polite' : 'off'} aria-atomic="true" data-news-caption>
          <a href={href(current)}>{current.title}</a><time>{dateText(current)}</time>
        </figcaption>
      </figure> : <div className={styles.editorial} data-news-enter aria-label="新闻栏目题图">
        <span>GANZI CONSTRUCTION INVESTMENT</span><strong>{title}</strong><p>关注集团动态</p>
        <small>栏目题图</small>
      </div>}
      {slides.length > 1 ? <div className={styles.controls}>
        <div className={styles.dots} aria-label="图片新闻选择">{slides.map((item, i) => <button type="button" key={item.id} aria-label={`查看第${i + 1}条图片新闻`} aria-current={i === index} onClick={() => setSelected(item.id)}><span /></button>)}</div>
        <div className={styles.actions}>
          <span className={styles.count} aria-hidden="true">{String(index + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}</span>
          <button type="button" aria-label="上一条图片新闻" onClick={() => selectOffset(-1)}>‹</button>
          <button type="button" aria-label="下一条图片新闻" onClick={() => selectOffset(1)}>›</button>
          <button type="button" aria-label={paused ? '播放图片新闻' : '暂停图片新闻'} aria-pressed={paused} onClick={() => setPaused((value) => !value)}>{paused ? '▷' : 'Ⅱ'}</button>
        </div>
      </div> : null}
    </div>
    <div className={styles.news}>
      <div className={styles.tabs} role="group" aria-label="首页新闻分类">
        {FIXED_CATEGORIES.map((name) => (
          <button type="button" key={name} aria-pressed={category === name} onClick={() => setCategory(name)}>{name}</button>
        ))}
      </div>
      <ul className={styles.list} data-home-news-list>{visibleItems.map((item, i) => <li key={item.id} data-news-enter>
        <a href={href(item)} className={`${styles.row}${i === 0 ? ` ${styles.lead}` : ''}`}>
          <span className={styles.rowText}><span className={styles.category}>{groupName(item)}</span><strong>{item.title}</strong>
            {i === 0 && (item.subtitle || item.summary) ? <span className={styles.summary}>{item.subtitle || item.summary}</span> : null}
          </span><time>{dateText(item)}</time><span className={styles.arrow} aria-hidden="true">↗</span>
        </a>
      </li>)}</ul>
      {!items.length ? <p className={styles.empty}>暂无已发布新闻</p> : !visibleItems.length ? <p className={styles.empty}>该分类暂无已发布新闻</p> : null}
      <a className={styles.more} href="/news">进入新闻中心 <span aria-hidden="true">→</span></a>
    </div>
  </div>;
}
