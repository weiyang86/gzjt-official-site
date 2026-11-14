'use client';

import { useEffect, useRef, useState } from 'react';
import type { HomepageSectionId } from '@/lib/cms/homepage-layout';

const photographs: Record<HomepageSectionId, string> = {
  news: '/img/雅砻江大桥.jpg',
  culture: '/img/国道317线（川藏公路北线）雀儿山隧道工程.jpg',
  business: '/img/雅砻江大桥.jpg',
  contact: '/img/国道317线（川藏公路北线）雀儿山隧道工程.jpg',
};

/** 装饰图不承载正文；后台背景优先，失败后仅在当前浏览器回退到本站工程照片。 */
export default function HomepageScenery({ section, background }: { section: HomepageSectionId; background: string }) {
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const imageRef = useRef<HTMLImageElement>(null);
  const source = background && !failedSources.includes(background) ? background : photographs[section];
  const custom = Boolean(background && source === background && !failedSources.includes(source));
  const markFailed = () => setFailedSources((current) => current.includes(source) ? current : [...current, source]);

  useEffect(() => {
    if (imageRef.current?.complete && !imageRef.current.naturalWidth) {
      setFailedSources((current) => current.includes(source) ? current : [...current, source]);
    }
  }, [source]);

  return (
    <div className={`home-scenery home-scenery--${section}`} data-custom-background={custom || undefined} aria-hidden="true">
      <img key={source} ref={imageRef} className="home-scenery-photo" src={source} alt="" decoding="async" hidden={failedSources.includes(source)} onError={markFailed} />
      <div className="home-scenery-veil" />
      <div className="home-scenery-drawing" />
    </div>
  );
}
