'use client';

import { useEffect, useState } from 'react';

export function LeadershipPortrait({ src, name, className = '' }: { src?: string; name: string; className?: string }) {
  const [failed, setFailed] = useState(!src);

  useEffect(() => setFailed(!src), [src]);

  if (failed || !src) {
    return <div className={`${className} is-missing`} role="img" aria-label={`${name}照片暂不可用`}><span>{name.trim().slice(0, 1) || '领'}</span></div>;
  }

  return <img className={className} src={src} alt={`${name}照片`} onError={() => setFailed(true)} />;
}
