'use client';

import { useState } from 'react';
import type { PageModuleContent, PageModuleItem } from '@/types/cms';

/**
 * 企业文化内容区：左侧条目列表点击后，右侧切换展示对应内容卡片。
 * 点击顶部“企业文化”标题可回到总述，展示企业文化说明文字与理念结构图。
 */
const OVERVIEW_ID = '__overview__';
const itemLabel = (title?: string) => {
  const label = title || '企业文化';
  return label === '使命' || label === '愿景' ? `企业${label}` : label;
};

export function CultureSection({ culture, items }: { culture: PageModuleContent | null; items: PageModuleItem[] }) {
  const title = culture?.title || '企业文化';
  const [activeId, setActiveId] = useState(OVERVIEW_ID);
  const isOverview = activeId === OVERVIEW_ID || !items.length;
  const active = items.find((item) => item.id === activeId) || items[0];

  return (
    <section id="culture" className="section about-culture" aria-label="企业文化">
      <div className="content about-culture-layout">
        <aside className="culture-rail" aria-label="企业文化条目">
          <div className="culture-rail-head">
            <a
              href="/about/culture"
              title="进入企业文化内容页面"
              style={{
                display: 'block',
                width: '100%',
                padding: 0,
                border: 0,
                background: 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                color: '#9c1a20',
                fontFamily: '"Noto Serif SC","Source Han Serif SC",serif',
                fontSize: 26,
                fontWeight: 900,
                letterSpacing: 2,
                lineHeight: 1.4,
                textDecoration: 'none',
              }}
            >
              {title}
            </a>
            <small>CORPORATE CULTURE</small>
          </div>
          <ul className="culture-rail-list">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={item.id === active?.id ? 'is-active' : undefined}
                  aria-current={item.id === active?.id ? 'true' : undefined}
                  onClick={() => setActiveId(item.id)}
                >
                  {itemLabel(item.title)}
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <div className="culture-panel">
          {isOverview ? (
            <article className="culture-article" key="overview">
              <h3>{title}</h3>
              {culture?.content ? (
                /<[a-z][\s\S]*>/i.test(culture.content)
                  ? <div className="culture-copy" dangerouslySetInnerHTML={{ __html: culture.content }} />
                  : <p className="culture-copy">{culture.content}</p>
              ) : <p className="culture-copy">企业文化内容暂未发布，敬请关注。</p>}
              {culture?.cover ? (
                <figure className="culture-figure" style={{ marginTop: 24 }}>
                  <img
                    src={culture.cover}
                    alt="企业文化理念体系结构图"
                    loading="lazy"
                    style={{ display: 'block', width: '100%', maxWidth: 420, height: 'auto', margin: '0 auto' }}
                  />
                </figure>
              ) : null}
            </article>
          ) : active ? (
            <article className="culture-article" key={active.id}>
              <h3>{active.subtitle || active.title}</h3>
              {active.image ? (
                <figure className="culture-figure">
                  <img src={active.image} alt={active.title || title} loading="lazy" />
                </figure>
              ) : null}
              {active.content ? (
                /<[a-z][\s\S]*>/i.test(active.content)
                  ? <div className="culture-copy" dangerouslySetInnerHTML={{ __html: active.content }} />
                  : <p className="culture-copy">{active.content}</p>
              ) : null}
            </article>
          ) : null}
        </div>
      </div>
    </section>
  );
}
