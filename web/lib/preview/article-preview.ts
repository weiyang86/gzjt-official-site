import crypto from 'node:crypto';
import { loadCmsEnv } from '@/lib/cms/client';

export type PreviewScope = 'news' | 'notice';

const previewTtlMs = 7 * 24 * 60 * 60 * 1000;

const getPreviewSecret = () => {
  loadCmsEnv();
  return (
    process.env.ARTICLE_PREVIEW_SECRET
    || process.env.PREVIEW_SECRET
    || process.env.DIRECTUS_TOKEN
    || process.env.DIRECTUS_PASSWORD
    || process.env.ADMIN_PASSWORD
    || ''
  );
};

const buildPayload = (id: string, scope: PreviewScope, expiresAt: number) => `${id}:${scope}:${expiresAt}`;

const createSignature = (payload: string) => {
  const secret = getPreviewSecret();
  if (!secret) {
    throw new Error('Article preview secret is not configured.');
  }
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
};

const safeEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

export const buildArticlePreviewPath = (id: string, scope: PreviewScope, expiresAt: number, signature: string) => {
  const params = new URLSearchParams({
    id,
    scope,
    exp: String(expiresAt),
    sig: signature,
  });
  return `/preview/article?${params.toString()}`;
};

export const createArticlePreviewPath = (id: string, scope: PreviewScope) => {
  const expiresAt = Date.now() + previewTtlMs;
  const signature = createSignature(buildPayload(id, scope, expiresAt));
  return buildArticlePreviewPath(id, scope, expiresAt, signature);
};

export const verifyArticlePreviewAccess = (id: string, scope: PreviewScope, expiresAt: number, signature: string) => {
  if (!id || !signature || !Number.isFinite(expiresAt)) return false;
  if (expiresAt < Date.now()) return false;
  const expected = createSignature(buildPayload(id, scope, expiresAt));
  return safeEqual(expected, signature);
};
