'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ContactInfoConfig } from '@/lib/cms/homepage-layout';

type Panel = 'phone' | 'qr' | 'links';
type Props = {
  screens: Array<{ id: string; title: string }>;
  activeIndex: number;
  onNavigate: (index: number) => void;
  contactInfo: ContactInfoConfig;
  qrContent: ReactNode;
  friendLinks: Array<{ id: string; title: string; url: string }>;
};

function RailIcon({ name }: { name: Panel | 'top' }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'phone' ? <path d="m5 3 4 1 1 5-3 2c2 3 3 4 6 6l2-3 5 1 1 4c-1 4-7 3-12-2S2 5 5 3Z" /> : null}
    {name === 'qr' ? <><path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h2v2h-2zM21 14v4h-3v3h3M13 21v-3M13 11v2H9M3 12h3M18 12h3" /></> : null}
    {name === 'links' ? <><path d="m10 14 4-4M8 16l-2 2a4 4 0 0 1-5-5l5-5a4 4 0 0 1 5 0M16 8l2-2a4 4 0 0 1 5 5l-5 5a4 4 0 0 1-5 0" transform="translate(0 -1) scale(.96)" /></> : null}
    {name === 'top' ? <path d="m5 13 7-7 7 7M12 6v15M5 3h14" /> : null}
  </svg>;
}

export default function HomepageRail({ screens, activeIndex, onNavigate, contactInfo, qrContent, friendLinks }: Props) {
  const [panel, setPanel] = useState<Panel | null>(null);
  const railRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const titles: Record<Panel, string> = { phone: '联系我们', qr: '公众平台', links: '友情链接' };
  const closePanel = () => { setPanel(null); triggerRef.current?.focus(); };

  useEffect(() => {
    if (!panel) return;
    const frame = requestAnimationFrame(() => closeRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setPanel(null);
      triggerRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !railRef.current?.contains(event.target)) setPanel(null);
    };
    const media = matchMedia('(max-width: 1100px)');
    const onResize = () => {
      if (!media.matches) return;
      setPanel(null);
      document.querySelector<HTMLButtonElement>('.home-screen-index [aria-current="true"]')?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    media.addEventListener('change', onResize);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
      media.removeEventListener('change', onResize);
    };
  }, [panel]);

  const tool = (id: Panel, label: string) => <button type="button" aria-label={label} aria-expanded={panel === id} aria-controls="home-rail-panel" onClick={(event) => {
    triggerRef.current = event.currentTarget;
    setPanel((current) => current === id ? null : id);
  }}><RailIcon name={id} /><span className="home-rail-tooltip">{label}</span></button>;

  return <>
    <aside className="home-side-rail" aria-label="首页快捷工具" ref={railRef}>
      <a className="home-rail-brand" href="/home" aria-label="甘孜建投首页"><span>GZJT</span><span>甘孜建投</span></a>
      <div className="home-rail-tools">
        {tool('phone', '联系信息')}
        {qrContent ? tool('qr', '公众平台二维码') : null}
        {friendLinks.length ? tool('links', '友情链接') : null}
        <span className="home-rail-rule" aria-hidden="true" />
        <button className="home-rail-top" type="button" aria-label="返回首页首屏" onClick={() => { setPanel(null); onNavigate(0); }}><RailIcon name="top" /><span>返回顶部</span></button>
        <span className="home-rail-count" aria-hidden="true">{String(activeIndex + 1).padStart(2, '0')}<i />{String(screens.length).padStart(2, '0')}</span>
      </div>
      <div className="home-rail-panel" id="home-rail-panel" role="region" aria-labelledby="home-rail-panel-title" hidden={!panel}>
        <header><h2 id="home-rail-panel-title">{panel ? titles[panel] : ''}</h2><button type="button" aria-label="关闭快捷面板" onClick={closePanel} ref={closeRef}>×</button></header>
        {panel === 'phone' ? <div className="home-rail-contact"><strong>{contactInfo.phone ? <a href={`tel:${contactInfo.phone}`}>{contactInfo.phone}</a> : '联系电话暂未配置'}</strong>{contactInfo.address ? <p>{contactInfo.address}</p> : null}<a className="home-rail-detail" href="/contact-us">查看联系信息　↗</a></div> : null}
        {panel === 'qr' ? qrContent : null}
        {panel === 'links' ? <div className="home-rail-links">{friendLinks.map((link) => <a key={link.id} href={link.url} target="_blank" rel="noreferrer">{link.title}<span aria-hidden="true">↗</span></a>)}</div> : null}
      </div>
    </aside>
    <nav className="home-screen-index" aria-label="首页分屏导航">{screens.map((screen, index) => <button type="button" key={screen.id} aria-label={`前往${screen.title}`} aria-current={activeIndex === index} onClick={() => { setPanel(null); onNavigate(index); }}><span className="home-index-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><span className="home-index-label" aria-hidden="true">{screen.title}</span></button>)}</nav>
  </>;
}
