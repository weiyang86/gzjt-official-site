'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Article, BusinessSector, PageModuleItem, Topic } from '@/types/cms';
import type { ContactInfoConfig, HomepageLayoutConfig, HomepageSectionId } from '@/lib/cms/homepage-layout';
import HomepageRail from './HomepageRail';
import HomepageScenery from './HomepageScenery';
import HomepageNews from './HomepageNews';

type Props = {
  children: ReactNode;
  articles: Article[];
  cultureArticles: Topic[];
  cultureItems: PageModuleItem[];
  sectors: BusinessSector[];
  qrs: Array<{ id: string; title: string; image: string; sort: number }>;
  quickLinks: Array<{ id: string; title: string; url: string; linkUrl: string }>;
  friendLinks: Array<{ id: string; title: string; url: string; sort: number }>;
  siteSettings: { siteName: string; footerText: string; logo: string; address: string; phone: string; email: string; icp: string; copyright: string };
  layout: HomepageLayoutConfig;
  contactInfo: ContactInfoConfig;
};

const safeHomepageLink = (value: string) => /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(value.trim()) ? value.trim() : '#';
const isExternalHomepageLink = (value: string) => /^https?:\/\//i.test(value.trim());

function QrImage({ src, title }: { src: string; title: string }) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const image = imageRef.current;
    if (image?.complete && !image.naturalWidth) setFailed(true);
  }, [src]);
  return failed
    ? <span className="home-qr-unavailable" role="img" aria-label={`${title}：二维码暂时无法加载`}>二维码暂不可用</span>
    : <img ref={imageRef} src={src} alt={title} loading="lazy" onError={() => setFailed(true)} />;
}

export default function HomepageExperience({ children, articles, cultureArticles, cultureItems, sectors, qrs, quickLinks, friendLinks, siteSettings, layout, contactInfo }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(0);
  const lockedRef = useRef(false);
  const switchTimerRef = useRef<number | null>(null);
  const touchStartRef = useRef<number | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchScrollRef = useRef<HTMLElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [bannerFade, setBannerFade] = useState<{ from: string; to: string; started: boolean } | null>(null);
  // 进入首页时背景图以叠化方式淡入，避免直接硬切出现。
  const [heroIntro, setHeroIntro] = useState(true);

  const visibleSections = useMemo(
    () => layout.sectionOrder.filter((section) => !layout.hiddenSections.includes(section)),
    [layout.hiddenSections, layout.sectionOrder],
  );
  // 按修改意见，首页只保留 4 个分屏：企业文化与联系关注合并，contact 不再单独成屏。
  const orderedSections = useMemo(
    () => visibleSections.filter((section) => section !== 'contact' || !visibleSections.includes('culture')),
    [visibleSections],
  );
  const mergeContact = visibleSections.includes('culture') && visibleSections.includes('contact');
  const screenIds = useMemo(() => ['hero', ...orderedSections], [orderedSections]);
  const manualSlides = useMemo(() => layout.bannerSlides.filter((slide) => slide.image || slide.video), [layout.bannerSlides]);
  const manualSlideImages = useMemo(() => new Set(manualSlides.map((slide) => slide.image).filter(Boolean)), [manualSlides]);
  const activeManualSlide = manualSlides.length ? manualSlides[bannerIndex % manualSlides.length] : null;
  const heroBackground = activeManualSlide?.image || layout.backgrounds.hero || '/img/index_bg.png';
  const heroVideo = activeManualSlide?.video || '';
  const previousHeroBackgroundRef = useRef(heroBackground);

  const sectionContent = layout.sectionContent;
  // 业务板块按《宣传手册》四大产业布局展示，首页不展示承接主体。
  const homepageSectors = useMemo(() => {
    const preferred = ['construction', 'construction-service', 'franchise-operation', 'emerging-industry'];
    const bySlug = new Map(sectors.map((sector) => [sector.slug, sector]));
    const picked = preferred.map((slug) => bySlug.get(slug)).filter((sector): sector is BusinessSector => Boolean(sector));
    return picked.length === preferred.length ? picked : sectors.slice(0, 4);
  }, [sectors]);
  // 二维码固定保留“微信公众号、微信视频号”两个位置，后台未配置时显示待上传占位。
  const qrSlots = useMemo(() => {
    const wechat = qrs.find((qr) => /公众号/.test(qr.title)) || qrs[0];
    const channels = qrs.find((qr) => /视频号/.test(qr.title)) || qrs[1];
    return [
      { key: 'wechat', title: '微信公众号', image: wechat?.image || '' },
      { key: 'channels', title: '微信视频号', image: channels?.image || '' },
    ];
  }, [qrs]);
  const tickerItems = useMemo(() => articles.slice(0, 6), [articles]);
  const qrContent = layout.showQrs ? <div className="home-qr-list">{qrSlots.map((slot) => <figure key={slot.key}>
    {slot.image ? <QrImage key={slot.image} src={slot.image} title={slot.title} /> : <div className="home-qr-unavailable" role="img" aria-label={`${slot.title}二维码待上传`}>二维码待上传</div>}
    <figcaption>{slot.title}</figcaption>
  </figure>)}</div> : null;
  const contactBlock = <div className="home-contact-content">
    <div className="home-contact-card">
      <h3>{siteSettings.siteName || '甘孜州建设投资集团有限公司'}</h3>
      <a className="home-mailbox" href={contactInfo.email ? `mailto:${contactInfo.email}` : '/contact-us'}>
        <span>董事长信箱</span>
        <strong>{contactInfo.email || '点击进入在线留言'}</strong>
      </a>
      {contactInfo.address ? <p>地址：{contactInfo.address}</p> : null}
      {contactInfo.phone ? <p>电话：{contactInfo.phone}</p> : null}
      {layout.showQuickLinks && quickLinks.length ? <div className="home-quick-links">{quickLinks.map((link) => <a href={link.url || link.linkUrl} key={link.id}>{link.title}　↗</a>)}</div> : null}
    </div>
    {qrContent}
    {friendLinks.length ? <div className="home-friend-links"><strong>友情链接</strong>{friendLinks.map((link) => <a href={link.url} target="_blank" rel="noreferrer" key={link.id}>{link.title}</a>)}</div> : null}
  </div>;
  const legalFooter = <footer className="home-legal">
    <p className="home-legal-lines">
      <span>{siteSettings.copyright || siteSettings.footerText || siteSettings.siteName || '网站'}</span>
      <span>{siteSettings.phone || layout.contactPhone ? `电话：${siteSettings.phone || layout.contactPhone}` : ''}{siteSettings.address ? `　地址：${siteSettings.address}` : ''}</span>
      <span>{(siteSettings.icp || layout.icpRecordNumber) ? <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer">{siteSettings.icp || layout.icpRecordNumber}</a> : null}</span>
      <span>本网站支持IPv6访问</span>
    </p>
  </footer>;

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
      const target = event.target as HTMLElement | null;
      if (target?.closest?.('.home-side-rail, .home-screen-index')) return;
      // 抽屉打开时，滚轮交给抽屉自己滚动
      if (target?.closest?.('[data-drawer]') || document.querySelector('.drawer.is-open')) return;
      // 分屏或横向列表还有可滚空间时，先滚动内容，滚到边界再切分屏
      const scrollable = target?.closest?.('.home-screen, .home-culture-values') as HTMLElement | null;
      if (scrollable) {
        const overflowY = window.getComputedStyle(scrollable).overflowY;
        const canScroll = overflowY === 'auto' || overflowY === 'scroll';
        const maxScroll = scrollable.scrollHeight - scrollable.clientHeight;
        if (canScroll && maxScroll > 4) {
          const atTop = scrollable.scrollTop <= 0;
          const atBottom = scrollable.scrollTop >= maxScroll - 2;
          if (event.deltaY > 0 ? !atBottom : !atTop) return;
        }
      }
      event.preventDefault();
      moveOne(event.deltaY > 0 ? 1 : -1);
    };
    scroller.addEventListener('wheel', onWheel, { passive: false });
    return () => scroller.removeEventListener('wheel', onWheel);
  }, [moveOne]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (document.querySelector('.drawer.is-open')) return;
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
    const timer = window.setTimeout(() => setHeroIntro(false), 80);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const from = previousHeroBackgroundRef.current;
    previousHeroBackgroundRef.current = heroBackground;
    if (from === heroBackground) return;

    setBannerFade({ from, to: heroBackground, started: false });
    // 先让新图层以透明状态完成一次样式计算，再开始叠化，避免两帧合并导致看不到过渡。
    const startTimer = window.setTimeout(() => {
      setBannerFade((current) => current?.to === heroBackground ? { ...current, started: true } : current);
    }, 50);
    const resetTimer = window.setTimeout(() => {
      setBannerFade((current) => current?.to === heroBackground ? null : current);
    }, 1150);
    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(resetTimer);
    };
  }, [heroBackground]);
  const sectionNodes: Record<HomepageSectionId, ReactNode> = {
    news: (
      <section key="news" {...screenState('news')} id="news">
        <HomepageScenery section="news" background={layout.backgrounds.news} />
        <div className="home-screen-inner">
          <header className="home-section-heading"><span>{sectionContent.news.eyebrow}</span><h2>{sectionContent.news.title}</h2><p>{sectionContent.news.subtitle}</p></header>
          <HomepageNews articles={articles} limit={layout.newsItemCount} interval={layout.carouselInterval} active={screenIds[activeIndex] === 'news'} title={sectionContent.news.title} />
        </div>
      </section>
    ),
    culture: (
      <section key="culture" {...screenState('culture')} id="culture-topics">
        <HomepageScenery section="culture" background={layout.backgrounds.culture} />
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
              <div className="home-topic-grid">{cultureArticles.slice(0, layout.cultureItemCount).map((topic) => <a href={`/topics/${encodeURIComponent(topic.slug)}`} key={topic.id}>
                {topic.cover ? <img className="home-topic-cover" src={topic.cover} alt="" loading="lazy" /> : null}
                <span>专题专栏</span><h3>{topic.title}</h3><p>{topic.subtitle || topic.summary || ''}</p><b>查看内容　→</b>
              </a>)}</div>
            </div>
          ) : null}
          {!cultureItems.length && !cultureArticles.length ? <p className="home-empty">暂无已发布的企业文化与专题内容</p> : null}
          {mergeContact ? (
            <section className="home-contact-merge" aria-label="联系与关注">
              <header className="home-contact-merge-heading"><span>{sectionContent.contact.eyebrow}</span><h3>{sectionContent.contact.title}</h3></header>
              {contactBlock}
            </section>
          ) : null}
          {legalFooter}
        </div>
      </section>
    ),
    business: (
      <section key="business" {...screenState('business')} id="business">
        <HomepageScenery section="business" background={layout.backgrounds.business} />
        <div className="home-screen-inner">
          <header className="home-section-heading"><span>{sectionContent.business.eyebrow}</span><h2>{sectionContent.business.title}</h2><p>{sectionContent.business.subtitle}</p></header>
          <div className={`home-sector-grid home-sector-grid--${Math.min(Math.max(homepageSectors.length, 2), 4)}`}>{homepageSectors.map((sector) => <a href={`/business?sector=${encodeURIComponent(sector.slug)}`} key={sector.id} onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
            // 先写入产业布局页的历史记录，保证“返回”回到 /business。
            event.preventDefault();
            window.history.pushState(null, '', '/business');
            window.location.assign(`/business?sector=${encodeURIComponent(sector.slug)}`);
          }}>
            <div className="home-sector-copy"><h3>{sector.name || sector.title}</h3><p>{sector.intro || sector.description}</p><span aria-hidden="true">↗</span>
              {sector.cover ? <img className="home-sector-cover" src={sector.cover} alt="" loading="lazy" /> : null}
            </div>
          </a>)}{!homepageSectors.length ? <p className="home-empty">暂无已启用业务板块</p> : null}</div>
        </div>
      </section>
    ),
    contact: (
      <section key="contact" {...screenState('contact')} id="contact">
        <HomepageScenery section="contact" background={layout.backgrounds.contact} />
        <div className="home-screen-inner home-contact-inner">
          <header className="home-section-heading"><span>{sectionContent.contact.eyebrow}</span><h2>{sectionContent.contact.title}</h2><p>{sectionContent.contact.subtitle}</p></header>
          {contactBlock}
          {legalFooter}
        </div>
      </section>
    ),
  };

  return (
    <div className="home-experience" ref={scrollerRef} onTouchStart={(event) => {
      const target = event.target as HTMLElement | null;
      // 抽屉、页头内的手势交给它们自己处理，避免拖动菜单时误触发分屏切换
      if (target?.closest?.('[data-drawer], .site-header, .home-side-rail, .home-screen-index')) {
        touchStartRef.current = null;
        touchStartXRef.current = null;
        touchScrollRef.current = null;
        return;
      }
      const touch = event.touches[0];
      touchStartRef.current = touch?.clientY ?? null;
      touchStartXRef.current = touch?.clientX ?? null;
      touchScrollRef.current = (target?.closest?.('.home-culture-values, .home-screen') as HTMLElement | null) ?? null;
    }} onTouchEnd={(event) => {
      const start = touchStartRef.current;
      const startX = touchStartXRef.current;
      const end = event.changedTouches[0]?.clientY;
      const endX = event.changedTouches[0]?.clientX;
      const scroller = touchScrollRef.current;
      touchStartRef.current = null;
      touchStartXRef.current = null;
      touchScrollRef.current = null;
      if (start === null || end === undefined) return;
      const deltaY = start - end;
      const deltaX = startX === null || endX === undefined ? 0 : startX - endX;
      // 横向手势交给可横向滚动的容器（如企业文化卡片），不切换分屏
      if (Math.abs(deltaX) > Math.abs(deltaY)) return;
      if (Math.abs(deltaY) <= 40) return;
      const goingNext = deltaY > 0;
      // 分屏内容可以纵向滚动时，先滚到底/顶部再切换，避免手势被抢走
      if (scroller) {
        const maxScrollTop = scroller.scrollHeight - scroller.clientHeight;
        if (maxScrollTop > 4) {
          const atTop = scroller.scrollTop <= 0;
          const atBottom = scroller.scrollTop >= maxScrollTop - 2;
          if (goingNext ? !atBottom : !atTop) return;
        }
      }
      moveOne(goingNext ? 1 : -1);
    }}>
      {children}
      <section key="hero" {...screenState('hero')} id="hero">
        {heroVideo
          ? <video key={heroVideo} className="home-hero-video" src={heroVideo} poster={heroBackground} autoPlay muted loop playsInline aria-hidden="true" />
          : bannerFade ? <>
            <div className={`home-hero-backdrop${bannerFade.started ? ' is-fading-out' : ''}${heroIntro ? ' is-intro' : ''}`} style={{ backgroundImage: `url("${bannerFade.from}")` }} aria-hidden="true" />
            <div className={`home-hero-backdrop${bannerFade.started ? ' is-fading-in' : ' is-fade-pending'}${heroIntro ? ' is-intro' : ''}`} style={{ backgroundImage: `url("${bannerFade.to}")` }} aria-hidden="true" />
          </> : heroBackground ? <div className={`home-hero-backdrop${heroIntro ? ' is-intro' : ''}`} style={{ backgroundImage: `url("${heroBackground}")` }} aria-hidden="true" /> : null}
        {bannerFade ? <>
          {manualSlideImages.has(bannerFade.from) ? <img className={`home-hero-poster${bannerFade.started ? ' is-fading-out' : ''}${heroIntro ? ' is-intro' : ''}`} src={bannerFade.from} alt="" aria-hidden="true" /> : null}
          {manualSlideImages.has(bannerFade.to) ? <img className={`home-hero-poster${bannerFade.started ? ' is-fading-in' : ' is-fade-pending'}${heroIntro ? ' is-intro' : ''}`} src={bannerFade.to} alt="" aria-hidden="true" /> : null}
        </> : activeManualSlide?.image && !heroVideo ? <img className={`home-hero-poster${heroIntro ? ' is-intro' : ''}`} src={activeManualSlide.image} alt="" aria-hidden="true" /> : null}
        {activeManualSlide?.linkUrl ? <a className="home-hero-banner-hit-area" href={safeHomepageLink(activeManualSlide.linkUrl)} target={isExternalHomepageLink(activeManualSlide.linkUrl) ? '_blank' : undefined} rel={isExternalHomepageLink(activeManualSlide.linkUrl) ? 'noopener noreferrer' : undefined} aria-label={`打开 Banner：${activeManualSlide.title || '首页推荐'}`} /> : null}
        {(layout.heroTitle || layout.heroSubtitle) ? <div className="home-hero-copy">
          {layout.heroTitle ? <h1 className="home-hero-title">{layout.heroTitle}</h1> : null}
          {layout.heroSubtitle ? <p className="home-hero-subtitle">{layout.heroSubtitle}</p> : null}
        </div> : null}
        {manualSlides.length > 1 ? <div className="home-hero-dots home-hero-dots--banner">{manualSlides.map((slide, index) => <button type="button" aria-label={`切换到第${index + 1}张Banner`} aria-current={index === bannerIndex} onClick={() => setBannerIndex(index)} key={slide.id} />)}</div> : null}
        {tickerItems.length ? (
          <div className="home-hero-ticker" aria-label="最新集团动态">
            <span className="home-hero-ticker-label">集团要闻</span>
            <div className="home-hero-ticker-window">
              <div className="home-hero-ticker-track">
                {[...tickerItems, ...tickerItems].map((article, index) => (
                  <a href={`/news/${encodeURIComponent(article.id)}`} key={`${article.id}-${index}`} tabIndex={index < tickerItems.length ? 0 : -1} aria-hidden={index >= tickerItems.length || undefined}>{article.title}</a>
                ))}
              </div>
            </div>
          </div>
        ) : null}
        <a className="home-hero-down" href="#news" onClick={(event) => { event.preventDefault(); goTo(1); }}>向下浏览　↓</a>
      </section>
      {orderedSections.map((section) => <Fragment key={section}>{sectionNodes[section]}</Fragment>)}
      <HomepageRail screens={screenIds.map((id) => ({ id, title: id === 'hero' ? '首页' : sectionContent[id as HomepageSectionId].title }))} activeIndex={activeIndex} onNavigate={goTo} contactInfo={contactInfo} qrContent={qrContent} friendLinks={friendLinks} />
    </div>
  );
}
