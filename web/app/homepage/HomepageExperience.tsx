'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Article, BusinessSector, PageModuleItem, Topic } from '@/types/cms';
import type { ContactInfoConfig, HomepageLayoutConfig, HomepageSectionId } from '@/lib/cms/homepage-layout';

type Props = {
  children: ReactNode;
  articles: Article[];
  cultureArticles: Topic[];
  cultureItems: PageModuleItem[];
  sectors: BusinessSector[];
  qrs: Array<{ id: string; title: string; image: string; sort: number }>;
  quickLinks: Array<{ id: string; title: string; url: string; linkUrl: string }>;
  friendLinks: Array<{ id: string; title: string; url: string; sort: number }>;
  homeStats: Array<{ id: string; label: string; value: string; unit: string; sort: number }>;
  siteSettings: { siteName: string; footerText: string; logo: string; address: string; phone: string; email: string; icp: string; copyright: string };
  layout: HomepageLayoutConfig;
  contactInfo: ContactInfoConfig;
};

const articleHref = (article: Article) => `/news/${encodeURIComponent(article.id)}`;
const safeHomepageLink = (value: string) => /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(value.trim()) ? value.trim() : '#';
const isExternalHomepageLink = (value: string) => /^https?:\/\//i.test(value.trim());

function AnimatedStatValue({ value, delay, active }: { value: string; delay: number; active: boolean }) {
  const elementRef = useRef<HTMLSpanElement>(null);
  const [progress, setProgress] = useState(1);
  const match = value.match(/^([^\d+-]*)([+-]?\d+(?:,\d{3})*(?:\.\d+)?)([^\d]*)$/);
  const target = match ? Number(match[2].replaceAll(',', '')) : NaN;
  const decimals = match?.[2].split('.')[1]?.length || 0;
  const canAnimate = Number.isFinite(target) && Math.abs(target) <= Number.MAX_SAFE_INTEGER && decimals <= 10;

  useEffect(() => {
    const element = elementRef.current;
    if (!active) { setProgress(0); return; }
    if (!element || !canAnimate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setProgress(1);
      return;
    }
    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      window.cancelAnimationFrame(frame);
      setProgress(0);
      if (!entry.isIntersecting) return;
      const start = performance.now() + delay;
      const tick = (now: number) => {
        const elapsed = Math.min(1, Math.max(0, (now - start) / 1400));
        setProgress(1 - (1 - elapsed) ** 3);
        if (elapsed < 1) frame = window.requestAnimationFrame(tick);
      };
      frame = window.requestAnimationFrame(tick);
    }, { root: element.closest('.home-experience'), threshold: 0.5 });
    observer.observe(element);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [active, canAnimate, delay, value]);

  let display = value;
  if (canAnimate && match && progress < 1) {
    let number = (target * progress).toFixed(decimals);
    if (match[2].includes(',')) {
      const [integer, fraction] = number.split('.');
      number = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (fraction === undefined ? '' : `.${fraction}`);
    }
    display = `${match[1]}${match[2].startsWith('+') ? '+' : ''}${number}${match[3]}`;
  }
  return <span ref={elementRef} aria-label={value} style={{ display: 'inline-block', fontVariantNumeric: 'tabular-nums' }}><span aria-hidden="true">{display}</span></span>;
}

export default function HomepageExperience({ children, articles, cultureArticles, cultureItems, sectors, qrs, quickLinks, homeStats, friendLinks, siteSettings, layout, contactInfo }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(0);
  const lockedRef = useRef(false);
  const switchTimerRef = useRef<number | null>(null);
  const touchStartRef = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [bannerFade, setBannerFade] = useState<{ from: string; to: string; started: boolean } | null>(null);

  const orderedSections = useMemo(
    () => layout.sectionOrder.filter((section) => !layout.hiddenSections.includes(section)),
    [layout.hiddenSections, layout.sectionOrder],
  );
  const screenIds = useMemo(() => ['hero', ...orderedSections], [orderedSections]);
  const manualSlides = useMemo(() => layout.bannerSlides.filter((slide) => slide.image), [layout.bannerSlides]);
  const activeManualSlide = manualSlides.length ? manualSlides[bannerIndex % manualSlides.length] : null;
  const heroBackground = activeManualSlide?.image || layout.backgrounds.hero || '/img/index_bg.png';
  const previousHeroBackgroundRef = useRef(heroBackground);

  const backgroundStyle = (screen: HomepageSectionId) => layout.backgrounds[screen]
    ? { backgroundImage: `linear-gradient(rgba(7,24,43,.28),rgba(7,24,43,.32)),url("${layout.backgrounds[screen]}")` }
    : undefined;
  const sectionContent = layout.sectionContent;

  const goTo = useCallback((index: number) => {
    const bounded = Math.min(Math.max(index, 0), screenIds.length - 1);
    if (lockedRef.current || bounded === activeIndexRef.current) return;
    lockedRef.current = true;
    switchTimerRef.current = window.setTimeout(() => { lockedRef.current = false; }, 700);
    activeIndexRef.current = bounded;
    setActiveIndex(bounded);

  }, [screenIds.length]);

  const moveOne = useCallback((delta: number) => {
    goTo(activeIndexRef.current + delta);
  }, [goTo]);

  useEffect(() => () => {
    if (switchTimerRef.current !== null) window.clearTimeout(switchTimerRef.current);
  }, []);

  const screenState = (id: string) => {
    const active = screenIds[activeIndex] === id;
    return {
      className: `home-screen home-screen--${id}${active ? ' is-active' : ''}`,
      'aria-hidden': !active,
      inert: !active,
    };
  };

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < 18) return;
      event.preventDefault();
      moveOne(event.deltaY > 0 ? 1 : -1);
    };
    scroller.addEventListener('wheel', onWheel, { passive: false });
    return () => scroller.removeEventListener('wheel', onWheel);
  }, [moveOne]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, button, a, summary, [contenteditable="true"]')) return;
      if (['ArrowDown', 'PageDown', ' '].includes(event.key)) { event.preventDefault(); moveOne(1); }
      if (['ArrowUp', 'PageUp'].includes(event.key)) { event.preventDefault(); moveOne(-1); }
      if (event.key === 'Home') { event.preventDefault(); goTo(0); }
      if (event.key === 'End') { event.preventDefault(); goTo(screenIds.length - 1); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goTo, moveOne, screenIds.length]);

  useEffect(() => {
    if (manualSlides.length < 2) return;
    const slideCount = manualSlides.length;
    const timer = window.setInterval(() => setBannerIndex((current) => (current + 1) % slideCount), layout.carouselInterval);
    return () => window.clearInterval(timer);
  }, [layout.carouselInterval, manualSlides.length]);

  useEffect(() => {
    const from = previousHeroBackgroundRef.current;
    previousHeroBackgroundRef.current = heroBackground;
    if (from === heroBackground) return;

    setBannerFade({ from, to: heroBackground, started: false });
    const frame = window.requestAnimationFrame(() => {
      setBannerFade((current) => current?.to === heroBackground ? { ...current, started: true } : current);
    });
    const timeout = window.setTimeout(() => {
      setBannerFade((current) => current?.to === heroBackground ? null : current);
    }, 800);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [heroBackground]);
  const sectionNodes: Record<HomepageSectionId, ReactNode> = {
    news: (
      <section key="news" {...screenState('news')} id="news" style={backgroundStyle('news')}>
        <div className="home-screen-inner">
          <header className="home-section-heading"><span>{sectionContent.news.eyebrow}</span><h2>{sectionContent.news.title}</h2><p>{sectionContent.news.subtitle}</p></header>
          <div className="home-news-grid">
            {articles.slice(0, layout.newsItemCount).map((article, index) => (
              <a className={`home-news-card${index === 0 ? ' home-news-card--featured' : ''}`} href={articleHref(article)} key={article.id}>
                <span>{article.mainChannel?.name || '集团新闻'}</span><h3>{article.title}</h3><p>{article.subtitle || article.summary || article.publishDate}</p>
              </a>
            ))}
            {!articles.length ? <p className="home-empty">暂无已发布新闻</p> : null}
          </div>
          <a className="home-more-link" href="/news">进入新闻中心　→</a>
        </div>
      </section>
    ),
    culture: (
      <section key="culture" {...screenState('culture')} id="culture-topics" style={backgroundStyle('culture')}>
        <div className="home-screen-inner">
          <header className="home-section-heading"><span>{sectionContent.culture.eyebrow}</span><h2>{sectionContent.culture.title}</h2><p>{sectionContent.culture.subtitle}</p></header>
          {cultureItems.length ? (
            <div className="home-culture-block">
              <p className="home-culture-block-title">企业文化</p>
              <div className="home-culture-values">
                {cultureItems.slice(0, layout.cultureItemCount).map((item) => (
                  <a href="/about#culture" key={item.id}>
                    <span>{item.title || '企业文化'}</span>
                    <strong>{item.subtitle || item.title}</strong>
                  </a>
                ))}
              </div>
            </div>
          ) : null}
          {cultureArticles.length ? (
            <div className="home-culture-block">
              <p className="home-culture-block-title">专题专栏</p>
              <div className="home-topic-grid">{cultureArticles.slice(0, layout.cultureItemCount).map((topic) => <a href={`/topics/${encodeURIComponent(topic.slug)}`} key={topic.id}><span>专题专栏</span><h3>{topic.title}</h3><p>{topic.subtitle || topic.summary || ''}</p><b>查看内容　→</b></a>)}</div>
            </div>
          ) : null}
          {!cultureItems.length && !cultureArticles.length ? <p className="home-empty">暂无已发布的企业文化与专题内容</p> : null}
        </div>
      </section>
    ),
    business: (
      <section key="business" {...screenState('business')} id="business" style={backgroundStyle('business')}>
        <div className="home-screen-inner">
          <header className="home-section-heading"><span>{sectionContent.business.eyebrow}</span><h2>{sectionContent.business.title}</h2><p>{sectionContent.business.subtitle}</p></header>
          {homeStats.length ? <section className="home-business-stats" aria-label="集团经营指标"><div className="home-business-stats-heading"><span>经营数据</span><small>首页动态指标</small></div><div className="home-business-stats-grid">{homeStats.slice(0, 4).map((item, index) => <article key={item.id}><span>{item.label}</span><strong><AnimatedStatValue value={item.value} delay={index * 100} active={screenIds[activeIndex] === 'business'} /><small>{item.unit}</small></strong></article>)}</div>{homeStats.length > 4 ? <details className="home-business-stats-more"><summary>查看全部经营指标（还有 {homeStats.length - 4} 项）</summary><div className="home-business-stats-grid">{homeStats.slice(4).map((item, index) => <article key={item.id}><span>{item.label}</span><strong><AnimatedStatValue value={item.value} delay={index * 100} active={screenIds[activeIndex] === 'business'} /><small>{item.unit}</small></strong></article>)}</div></details> : null}</section> : null}
          <div className="home-sector-grid">{sectors.slice(0, layout.businessItemCount).map((sector) => <a href={`/business?sector=${encodeURIComponent(sector.slug)}`} key={sector.id} style={sector.cover ? { backgroundImage: `linear-gradient(0deg,rgba(8,25,44,.8),rgba(8,25,44,.12)),url("${sector.cover}")` } : undefined}><h3>{sector.name || sector.title}</h3><p>{sector.intro || sector.description}</p></a>)}{!sectors.length ? <p className="home-empty">暂无已启用业务板块</p> : null}</div>
        </div>
      </section>
    ),
    contact: (
      <section key="contact" {...screenState('contact')} id="contact" style={backgroundStyle('contact')}>
        <div className="home-screen-inner home-contact-inner">
          <header className="home-section-heading"><span>{sectionContent.contact.eyebrow}</span><h2>{sectionContent.contact.title}</h2><p>{sectionContent.contact.subtitle}</p></header>
          <div className="home-contact-content"><div className="home-contact-card"><h3>{siteSettings.siteName || '甘孜州建设投资集团有限公司'}</h3>{contactInfo.address ? <p>地址：{contactInfo.address}</p> : null}{contactInfo.phone ? <p>电话：{contactInfo.phone}</p> : null}{contactInfo.email ? <p>邮箱：<a href={`mailto:${contactInfo.email}`}>{contactInfo.email}</a></p> : null}{layout.showQuickLinks ? <div className="home-quick-links">{quickLinks.map((link) => <a href={link.url || link.linkUrl} key={link.id}>{link.title}　↗</a>)}</div> : null}</div>
            {layout.showQrs ? <div className="home-qr-list">{qrs.map((qr) => <figure key={qr.id}><img src={qr.image} alt={qr.title || '集团公众平台二维码'} /><figcaption>{qr.title || '公众平台'}</figcaption></figure>)}</div> : null}
            {friendLinks.length ? <div className="home-friend-links"><strong>友情链接</strong>{friendLinks.map((link) => <a href={link.url} target="_blank" rel="noreferrer" key={link.id}>{link.title}</a>)}</div> : null}
          </div>
          <footer className="home-legal"><span>{siteSettings.copyright || siteSettings.footerText || siteSettings.siteName || '网站'}</span>{(siteSettings.icp || layout.icpRecordNumber) ? <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer">{siteSettings.icp || layout.icpRecordNumber}</a> : null}</footer>
        </div>
      </section>
    ),
  };

  return (
    <div className="home-experience" ref={scrollerRef} onTouchStart={(event) => { touchStartRef.current = event.touches[0]?.clientY ?? null; }} onTouchEnd={(event) => {
      const start = touchStartRef.current;
      const end = event.changedTouches[0]?.clientY;
      if (start !== null && end !== undefined && Math.abs(start - end) > 40) moveOne(start > end ? 1 : -1);
      touchStartRef.current = null;
    }}>
      {children}
      <section key="hero" {...screenState('hero')} id="hero">
        {bannerFade ? <>
          <div className={`home-hero-backdrop${bannerFade.started ? ' is-fading-out' : ''}`} style={{ backgroundImage: `url("${bannerFade.from}")` }} aria-hidden="true" />
          <div className={`home-hero-backdrop${bannerFade.started ? ' is-fading-in' : ' is-fade-pending'}`} style={{ backgroundImage: `url("${bannerFade.to}")` }} aria-hidden="true" />
        </> : heroBackground ? <div className="home-hero-backdrop" style={{ backgroundImage: `url("${heroBackground}")` }} aria-hidden="true" /> : null}
        {activeManualSlide?.linkUrl ? <a className="home-hero-banner-hit-area" href={safeHomepageLink(activeManualSlide.linkUrl)} target={isExternalHomepageLink(activeManualSlide.linkUrl) ? '_blank' : undefined} rel={isExternalHomepageLink(activeManualSlide.linkUrl) ? 'noopener noreferrer' : undefined} aria-label={`打开 Banner：${activeManualSlide.title || '首页推荐'}`} /> : null}
        {manualSlides.length > 1 ? <div className="home-hero-dots home-hero-dots--banner">{manualSlides.map((slide, index) => <button type="button" aria-label={`切换到第${index + 1}张Banner`} aria-current={index === bannerIndex} onClick={() => setBannerIndex(index)} key={slide.id} />)}</div> : null}
        <a className="home-hero-down" href="#news" onClick={(event) => { event.preventDefault(); goTo(1); }}>向下浏览　↓</a>
      </section>
      {orderedSections.map((section) => <Fragment key={section}>{sectionNodes[section]}</Fragment>)}
      <nav className="home-screen-index" aria-label="首页分屏导航">{screenIds.map((id, index) => <button type="button" key={id} aria-label={`前往${id === 'hero' ? '首页' : sectionContent[id as HomepageSectionId].title}`} aria-current={activeIndex === index} onClick={() => goTo(index)} />)}</nav>
    </div>
  );
}
