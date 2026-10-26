import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { defaultSeoConfig, getSiteBaseUrl } from '@/lib/seo/pages';
import Script from 'next/script';

export const metadata: Metadata = {
  metadataBase: new URL(getSiteBaseUrl()),
  title: {
    default: defaultSeoConfig.defaultTitle,
    template: `%s - ${defaultSeoConfig.siteName}`,
  },
  description: defaultSeoConfig.defaultDescription,
  keywords: ['甘孜州建设投资集团', '甘孜建投', '交通建设', '城乡建设', '基础设施投资'],
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    siteName: defaultSeoConfig.siteName,
    title: defaultSeoConfig.defaultTitle,
    description: defaultSeoConfig.defaultDescription,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700;900&family=Noto+Sans+SC:wght@300;400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <Script src="/js/analytics.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
