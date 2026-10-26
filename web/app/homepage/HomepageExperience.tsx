'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Article, BusinessSector, PageModuleItem } from '@/types/cms';
import type { ContactInfoConfig, HomepageLayoutConfig, HomepageSectionId } from '@/lib/cms/homepage-layout';

type Props = {
  children: ReactNode;
  articles: Article[];
  cultureArticles: Article[];
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

export default function HomepageExperience({ children, articles, cultureArticles, cultureItems, sectors, qrs, quickLinks, homeStats, friendLinks, siteSettings, layout, contactInfo }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(0);
  const lockedRef = useRef(false);
  const touchStartRef = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [bannerIndex, setBannerIndex] = useState(0);

  const orderedSections = useMemo(
    () => layout.sectionOrder.filter((section) => !layout.hiddenSections.includes(section)),
    [layout.hiddenSections, layout.sectionOrder],
  );
  const screenIds = useMemo(() => ['hero', ...orderedSections], [orderedSections]);
  const manualSlides = useMemo(() => layout.bannerSlides.filter((slide) => slide.image), [layout.bannerSlides]);
  const activeManualSlide = manualSlides.length ? manualSlides[bannerIndex % manualSlides.length] : null;
  const heroBackground = activeManualSlide?.image || layout.backgrounds.hero || '/img/index_bg.png';

  const backgroundStyle = (screen: HomepageSectionId) => layout.backgrounds[screen]
    ? { backgroundImage: `linear-gradient(rgba(7,24,43,.62),rgba(7,24,43,.68)),url("${layout.backgrounds[screen]}")` }
    : undefined;
  const sectionContent = layout.sectionContent;

  const goTo = useCallback((index: number) => {
    const bounded = Math.min(Math.max(index, 0), screenIds.length - 1);
    activeIndexRef.current = bounded;
    setActiveIndex(bounded);
    scrollerRef.current?.querySelectorAll<HTMLElement>('.home-screen')[bounded]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [screenIds.length]);

  const moveOne = useCallback((delta: number) => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    goTo(activeIndexRef.current + delta);
    window.setTimeout(() => { lockedRef.current = false; }, 850);
  }, [goTo]);

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
  const sectionNodes: Record<HomepageSectionId, ReactNode> = {
    news: (
      <section className="home-screen home-screen--news" id="news" key="news" style={backgroundStyle('news')}>
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
      <section className="home-screen home-screen--culture" id="culture-topics" key="culture" style={backgroundStyle('culture')}>
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
              <div className="home-topic-grid">{cultureArticles.slice(0, layout.cultureItemCount).map((article) => <a href={articleHref(article)} key={article.id}><span>专题专栏</span><h3>{article.title}</h3><p>{article.subtitle || article.summary || ''}</p><b>查看内容　→</b></a>)}</div>
            </div>
          ) : null}
          {!cultureItems.length && !cultureArticles.length ? <p className="home-empty">暂无已发布的企业文化与专题内容</p> : null}
        </div>
      </section>
    ),
    business: (
      <section className="home-screen home-screen--business" id="business" key="business" style={backgroundStyle('business')}>
        <div className="home-screen-inner">
          <header className="home-section-heading"><span>{sectionContent.business.eyebrow}</span><h2>{sectionContent.business.title}</h2><p>{sectionContent.business.subtitle}</p></header>
          {homeStats.length ? <section className="home-business-stats" aria-label="集团经营指标"><div className="home-business-stats-heading"><span>经营数据</span><small>首页动态指标</small></div><div className="home-business-stats-grid">{homeStats.slice(0, 4).map((item) => <article key={item.id}><span>{item.label}</span><strong>{item.value}<small>{item.unit}</small></strong></article>)}</div>{homeStats.length > 4 ? <details className="home-business-stats-more"><summary>查看全部经营指标（还有 {homeStats.length - 4} 项）</summary><div className="home-business-stats-grid">{homeStats.slice(4).map((item) => <article key={item.id}><span>{item.label}</span><strong>{item.value}<small>{item.unit}</small></strong></article>)}</div></details> : null}</section> : null}
          <div className="home-sector-grid">{sectors.slice(0, layout.businessItemCount).map((sector) => <a href={`/business?sector=${encodeURIComponent(sector.slug)}`} key={sector.id} style={sector.cover ? { backgroundImage: `linear-gradient(0deg,rgba(8,25,44,.8),rgba(8,25,44,.12)),url("${sector.cover}")` } : undefined}><h3>{sector.name || sector.title}</h3><p>{sector.intro || sector.description}</p></a>)}{!sectors.length ? <p className="home-empty">暂无已启用业务板块</p> : null}</div>
        </div>
      </section>
    ),
    contact: (
      <section className="home-screen home-screen--contact" id="contact" key="contact" style={backgroundStyle('contact')}>
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
      <section className="home-screen home-screen--hero" id="hero" key="hero">
        {heroBackground ? <div className="home-hero-backdrop" style={{ backgroundImage: `url("${heroBackground}")` }} aria-hidden="true" /> : null}
        {activeManualSlide?.linkUrl ? <a className="home-hero-banner-hit-area" href={safeHomepageLink(activeManualSlide.linkUrl)} target={isExternalHomepageLink(activeManualSlide.linkUrl) ? '_blank' : undefined} rel={isExternalHomepageLink(activeManualSlide.linkUrl) ? 'noopener noreferrer' : undefined} aria-label={`打开 Banner：${activeManualSlide.title || '首页推荐'}`} /> : null}
        <div className="home-hero-copy"><span>{layout.heroEyebrow}</span><h1 className="home-hero-title">{activeManualSlide?.title || layout.heroTitle}</h1>
          <p className="home-hero-subtitle">{activeManualSlide?.subtitle || layout.heroSubtitle || '建设甘孜，服务全州'}</p>
          {activeManualSlide?.linkUrl ? <a className="home-hero-article" href={safeHomepageLink(activeManualSlide.linkUrl)} target={isExternalHomepageLink(activeManualSlide.linkUrl) ? '_blank' : undefined} rel={isExternalHomepageLink(activeManualSlide.linkUrl) ? 'noopener noreferrer' : undefined}><strong>查看详情</strong><span>点击进入目标页面　→</span></a> : null}
          {manualSlides.length > 1 ? <div className="home-hero-dots">{manualSlides.map((slide, index) => <button type="button" aria-label={`切换到第${index + 1}张Banner`} aria-current={index === bannerIndex} onClick={() => setBannerIndex(index)} key={slide.id} />)}</div> : null}
        </div>
        <a className="home-hero-down" href="#news" onClick={(event) => { event.preventDefault(); goTo(1); }}>向下浏览　↓</a>
      </section>
      {orderedSections.map((section) => sectionNodes[section])}
      <nav className="home-screen-index" aria-label="首页分屏导航">{screenIds.map((id, index) => <button type="button" key={id} aria-label={`前往${id === 'hero' ? '首页' : sectionContent[id as HomepageSectionId].title}`} aria-current={activeIndex === index} onClick={() => goTo(index)} />)}</nav>
    </div>
  );
}
