'use client';

import { useEffect, useState, type CSSProperties } from 'react';

export function TopicCover({ src, fallback, alt = '', style }: {
  src?: string;
  fallback: string;
  alt?: string;
  style?: CSSProperties;
}) {
  const [value, setValue] = useState(src || fallback);

  useEffect(() => {
    setValue(src || fallback);
  }, [src, fallback]);

  return (
    <img
      src={value}
      alt={alt}
      style={style}
      onError={() => {
        if (value !== fallback) setValue(fallback);
      }}
    />
  );
}
