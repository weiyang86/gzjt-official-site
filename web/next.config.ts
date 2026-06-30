import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  async redirects() {
    return [
      { source: '/pages/about/index.html', destination: '/about', permanent: false },
      { source: '/pages/disclosure/index.html', destination: '/disclosure', permanent: false },
      { source: '/pages/news/index.html', destination: '/news', permanent: false },
      { source: '/pages/business/index.html', destination: '/business-dev', permanent: false },
      { source: '/pages/projects/index.html', destination: '/projects', permanent: false },
      { source: '/pages/party/index.html', destination: '/party-masses', permanent: false },
      { source: '/pages/responsibility/index.html', destination: '/social-responsibility', permanent: false },
      { source: '/pages/contact/index.html', destination: '/contact-us', permanent: false },
      { source: '/pages/org/:slug/index.html', destination: '/org/:slug', permanent: false },
      { source: '/admin/articles.html', destination: '/admin/articles', permanent: false },
      { source: '/admin/categories.html', destination: '/admin/categories', permanent: false },
      { source: '/admin/notice-articles.html', destination: '/admin/notice-articles', permanent: false },
      { source: '/admin/notice-categories.html', destination: '/admin/notice-categories', permanent: false },
      { source: '/admin/article-edit.html', destination: '/admin/article-edit', permanent: false },
      { source: '/admin/notice-edit.html', destination: '/admin/notice-edit', permanent: false },
      { source: '/admin/content.html', destination: '/admin/content', permanent: false },
      { source: '/admin/page-modules.html', destination: '/admin/page-modules', permanent: false },
      { source: '/group', destination: '/about', permanent: false },
      { source: '/group/organization/subsidiaries/:path*', destination: '/org', permanent: false },
      { source: '/group/:path*', destination: '/about', permanent: false },
      { source: '/news-center', destination: '/news', permanent: false },
      { source: '/news-center/:path*', destination: '/news', permanent: false },
      { source: '/subsidiaries/:path*', destination: '/org', permanent: false },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/pages/:path*',
        destination: '/legacy-static/pages/:path*',
      },
      {
        source: '/A版官网首页.html',
        destination: '/legacy-static/A版官网首页.html',
      },
      {
        source: '/index.html',
        destination: '/',
      },
    ];
  },
};

export default nextConfig;
