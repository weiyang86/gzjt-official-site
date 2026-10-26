import crypto from 'node:crypto';

type GuardStore = {
  rateLimits: Map<string, number[]>;
  fingerprints: Map<string, number>;
};

const globalForMessages = globalThis as typeof globalThis & {
  __gzjtMessageGuard?: GuardStore;
};

const store: GuardStore = globalForMessages.__gzjtMessageGuard || {
  rateLimits: new Map<string, number[]>(),
  fingerprints: new Map<string, number>(),
};
globalForMessages.__gzjtMessageGuard = store;

const prune = (timestamps: number[], windowMs: number, now: number) => (
  timestamps.filter((timestamp) => now - timestamp < windowMs)
);

export const isRateLimited = (key: string, limit: number, windowMs: number, now = Date.now()) => {
  const timestamps = prune(store.rateLimits.get(key) || [], windowMs, now);
  store.rateLimits.set(key, timestamps);
  return timestamps.length >= limit;
};

export const recordRateLimit = (key: string, now = Date.now()) => {
  const timestamps = store.rateLimits.get(key) || [];
  timestamps.push(now);
  store.rateLimits.set(key, timestamps);
};

export const contentFingerprint = (phone: string, content: string) => crypto
  .createHash('sha256')
  .update(`${phone}::${content.replace(/\s+/g, ' ').trim()}`)
  .digest('hex');

export const hasRecentFingerprint = (fingerprint: string, windowMs = 10 * 60 * 1000, now = Date.now()) => {
  store.fingerprints.forEach((timestamp, key) => {
    if (now - timestamp >= windowMs) store.fingerprints.delete(key);
  });
  const timestamp = store.fingerprints.get(fingerprint);
  return typeof timestamp === 'number' && now - timestamp < windowMs;
};

export const rememberFingerprint = (fingerprint: string, now = Date.now()) => {
  store.fingerprints.set(fingerprint, now);
};

export const getClientIp = (headers: Headers) => {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return headers.get('x-real-ip') || headers.get('cf-connecting-ip') || 'unknown';
};

export const isSameOriginRequest = (headers: Headers) => {
  const origin = headers.get('origin');
  const host = headers.get('host');
  if (!origin) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
};
