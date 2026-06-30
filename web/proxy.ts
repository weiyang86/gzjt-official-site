import { NextResponse, type NextRequest } from 'next/server';

const adminSessionCookie = 'gzjt_admin_session';
const adminLoginPath = '/admin/login';

const isProtectedAdminPath = (pathname: string) => (
  pathname === '/admin'
  || pathname === '/admin/dashboard'
  || pathname === '/admin/dashboard.html'
  || pathname === '/admin/articles'
  || pathname === '/admin/articles.html'
  || pathname === '/admin/categories'
  || pathname === '/admin/categories.html'
  || pathname === '/admin/notice-articles'
  || pathname === '/admin/notice-articles.html'
  || pathname === '/admin/notice-categories'
  || pathname === '/admin/notice-categories.html'
  || pathname === '/admin/article-edit'
  || pathname === '/admin/article-edit.html'
  || pathname === '/admin/notice-edit'
  || pathname === '/admin/notice-edit.html'
  || pathname === '/admin/content'
  || pathname === '/admin/content.html'
  || pathname === '/admin/page-modules'
  || pathname === '/admin/page-modules.html'
);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/admin/login.html') {
    return NextResponse.redirect(new URL(adminLoginPath, request.url));
  }

  if (pathname === '/admin/dashboard.html') {
    const target = new URL('/admin/dashboard', request.url);
    if (!request.cookies.get(adminSessionCookie)?.value) {
      target.pathname = adminLoginPath;
    }
    return NextResponse.redirect(target);
  }

  const htmlRedirects: Record<string, string> = {
    '/admin/articles.html': '/admin/articles',
    '/admin/categories.html': '/admin/categories',
    '/admin/notice-articles.html': '/admin/notice-articles',
    '/admin/notice-categories.html': '/admin/notice-categories',
    '/admin/article-edit.html': '/admin/article-edit',
    '/admin/notice-edit.html': '/admin/notice-edit',
    '/admin/content.html': '/admin/content',
    '/admin/page-modules.html': '/admin/page-modules',
  };
  if (htmlRedirects[pathname]) {
    const target = new URL(htmlRedirects[pathname], request.url);
    if (!request.cookies.get(adminSessionCookie)?.value) target.pathname = adminLoginPath;
    return NextResponse.redirect(target);
  }

  if (isProtectedAdminPath(pathname) && !request.cookies.get(adminSessionCookie)?.value) {
    return NextResponse.redirect(new URL(adminLoginPath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin',
    '/admin/dashboard',
    '/admin/dashboard.html',
    '/admin/login.html',
    '/admin/articles',
    '/admin/articles.html',
    '/admin/categories',
    '/admin/categories.html',
    '/admin/notice-articles',
    '/admin/notice-articles.html',
    '/admin/notice-categories',
    '/admin/notice-categories.html',
    '/admin/article-edit',
    '/admin/article-edit.html',
    '/admin/notice-edit',
    '/admin/notice-edit.html',
    '/admin/content',
    '/admin/content.html',
    '/admin/page-modules',
    '/admin/page-modules.html',
  ],
};
