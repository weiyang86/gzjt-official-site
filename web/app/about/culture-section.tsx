'use client';

import { useState } from 'react';
import type { PageModuleContent, PageModuleItem } from '@/types/cms';

/**
 * 企业文化内容区：左侧条目列表点击后，右侧切换展示对应内容卡片。
 * 右侧不保留固定的“企业文化”总述，每次只显示当前选中的一条内容。
 */
const itemLabel = (title?: string) => {
  const label = title || '企业文化';
  return label === '使命' || label === '愿景' ? `企业${label}` : label;
};

export function CultureSection({ culture, items }: { culture: PageModuleContent | null; items: PageModuleItem[] }) {
  const title = culture?.title || '企业文化';
  const [activeId, setActiveId] = useState(items[0]?.id || '');
  const active = items.find((item) => item.id === activeId) || items[0];

  return (
    <section id="culture" className="section about-culture" aria-label="企业文化">
      <div className="content about-culture-layout">
        <aside className="culture-rail" aria-label="企业文化条目">
          <div className="culture-rail-head">
            <strong>{title}</strong>
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
          {active ? (
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
          ) : culture?.content ? (
            /<[a-z][\s\S]*>/i.test(culture.content)
              ? <div className="about-culture-overview" dangerouslySetInnerHTML={{ __html: culture.content }} />
              : <p className="about-culture-overview">{culture.content}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
