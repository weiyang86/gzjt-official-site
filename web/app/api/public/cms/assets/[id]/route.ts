import { NextResponse } from 'next/server';
import { cmsPublicAssetFetch, CmsRequestError } from '@/lib/cms/client';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const assetResponse = await cmsPublicAssetFetch(id);
    const headers = new Headers();
    const contentType = assetResponse.headers.get('content-type');
    const contentLength = assetResponse.headers.get('content-length');
    const cacheControl = assetResponse.headers.get('cache-control');
    const etag = assetResponse.headers.get('etag');
    if (contentType) headers.set('content-type', contentType);
    if (contentLength) headers.set('content-length', contentLength);
    if (cacheControl) headers.set('cache-control', cacheControl);
    if (etag) headers.set('etag', etag);
    return new Response(assetResponse.body, {
      status: assetResponse.status,
      statusText: assetResponse.statusText,
      headers,
    });
  } catch (error) {
    if (error instanceof CmsRequestError) {
      return NextResponse.json(
        { error: { code: 'PUBLIC_ASSET_FETCH_FAILED', message: error.message } },
        { status: error.status || 500 },
      );
    }
    return NextResponse.json(
      { error: { code: 'PUBLIC_ASSET_FETCH_FAILED', message: 'Asset fetch failed' } },
      { status: 500 },
    );
  }
}
