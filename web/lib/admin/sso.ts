import crypto from 'node:crypto';

const DEFAULT_MAX_AGE_SECONDS = 5 * 60;
const MAX_FUTURE_SKEW_SECONDS = 60;

export class AdminSsoError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(
    message: string,
    code: string,
    status = 401,
  ) {
    super(message);
    this.name = 'AdminSsoError';
    this.code = code;
    this.status = status;
  }
}

const decodeCiphertext = (value: string) => {
  let decoded = value.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    throw new AdminSsoError('单点登录凭证格式错误', 'INVALID_SSO_KEY', 400);
  }
  if (!decoded || decoded.length > 4096 || !/^[A-Za-z0-9_-]+$/.test(decoded)) {
    throw new AdminSsoError('单点登录凭证格式错误', 'INVALID_SSO_KEY', 400);
  }
  return Buffer.from(decoded.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
};

const desKey = (secret: string) => {
  const bytes = Buffer.from(secret, 'utf8');
  if (bytes.length < 8) {
    throw new AdminSsoError('单点登录密钥配置无效', 'SSO_NOT_CONFIGURED', 503);
  }
  const key = bytes.subarray(0, 8);
  // OpenSSL 3 commonly disables single DES. 3DES with K1=K2=K3 is
  // cryptographically equivalent to Java's DES/ECB/PKCS5Padding here.
  return Buffer.concat([key, key, key]);
};

export const decryptAdminSsoKey = (encrypted: string, secret: string) => {
  try {
    const decipher = crypto.createDecipheriv('des-ede3', desKey(secret), null);
    decipher.setAutoPadding(true);
    return Buffer.concat([decipher.update(decodeCiphertext(encrypted)), decipher.final()]).toString('utf8');
  } catch (error) {
    if (error instanceof AdminSsoError) throw error;
    throw new AdminSsoError('单点登录凭证无效', 'INVALID_SSO_KEY');
  }
};

const configuredMaxAgeSeconds = () => {
  const value = Number(process.env.ADMIN_SSO_MAX_AGE_SECONDS || DEFAULT_MAX_AGE_SECONDS);
  return Number.isFinite(value) && value >= 30 && value <= 3600 ? value : DEFAULT_MAX_AGE_SECONDS;
};

export const parseAdminSsoCredential = (encrypted: string, secret: string, now = Date.now()) => {
  const plaintext = decryptAdminSsoKey(encrypted, secret);
  const separator = plaintext.lastIndexOf('#');
  if (separator <= 0) throw new AdminSsoError('单点登录凭证内容无效', 'INVALID_SSO_KEY');

  const username = plaintext.slice(0, separator).trim();
  const timestampText = plaintext.slice(separator + 1);
  const timestamp = Number(timestampText);
  if (!username || !/^\d{13}$/.test(timestampText) || !Number.isSafeInteger(timestamp)) {
    throw new AdminSsoError('单点登录凭证内容无效', 'INVALID_SSO_KEY');
  }

  const age = now - timestamp;
  if (age < -MAX_FUTURE_SKEW_SECONDS * 1000 || age > configuredMaxAgeSeconds() * 1000) {
    throw new AdminSsoError('单点登录链接已过期，请重新获取', 'SSO_KEY_EXPIRED');
  }
  return { username, timestamp };
};

export const normalizeAdminTargetUrl = (value?: string | null) => {
  const raw = String(value || '').trim();
  if (!raw) return '/admin';
  try {
    const url = new URL(raw, 'https://www.gzjtjt.cn');
    if (url.origin !== 'https://www.gzjtjt.cn' || (url.pathname !== '/admin' && !url.pathname.startsWith('/admin/'))) {
      return '/admin';
    }
    if (url.pathname === '/admin/login') return '/admin';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/admin';
  }
};
