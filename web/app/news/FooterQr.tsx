'use client';

import { useState } from 'react';

/** 二维码加载失败时优先回退到指定图片，没有兜底图则显示待上传占位。 */
export default function FooterQr({ src, alt, fallbackSrc = '' }: { src: string; alt: string; fallbackSrc?: string }) {
  const [source, setSource] = useState(src);

  if (!source) {
    return <span className="footer-qr-placeholder" role="img" aria-label={`${alt}待上传`}>待上传</span>;
  }

  return (
    <img
      src={source}
      alt={alt}
      loading="lazy"
      onError={() => setSource(fallbackSrc)}
    />
  );
}
