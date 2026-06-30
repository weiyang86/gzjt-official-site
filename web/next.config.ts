import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
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
