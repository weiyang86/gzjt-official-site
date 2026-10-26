'use client';

import { useEffect, useRef, useState } from 'react';

export function OrgChartFigure({ src, title }: { src: string; title: string }) {
  const [failed, setFailed] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const image = imageRef.current;
    if (image && image.complete && image.naturalWidth === 0) setFailed(true);
  }, [src]);

  if (failed) {
    return (
      <div className="body">
        <p>组织架构图加载失败，请稍后刷新重试。</p>
      </div>
    );
  }

  return (
    <figure style={{ margin: 0 }}>
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${title}（在新窗口查看原图）`}
        style={{ display: 'block', background: '#fff', border: '1px solid rgba(13,47,90,.12)', borderRadius: 16, overflow: 'hidden' }}
      >
        <img
          ref={imageRef}
          src={src}
          alt={title}
          onError={() => setFailed(true)}
          style={{ display: 'block', width: '100%', height: 'auto' }}
        />
      </a>
      <figcaption style={{ marginTop: 12, fontSize: 13, lineHeight: 1.8, color: 'rgba(11,18,32,.55)' }}>点击图片可在新窗口查看原图。</figcaption>
    </figure>
  );
}
