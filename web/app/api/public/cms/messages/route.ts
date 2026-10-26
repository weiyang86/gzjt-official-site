import { NextResponse, type NextRequest } from 'next/server';
import {
  findDuplicateMessage,
  listSiteMessages,
  createSiteMessage,
} from '@/lib/cms/messages';
import {
  contentFingerprint,
  getClientIp,
  hasRecentFingerprint,
  isRateLimited,
  isSameOriginRequest,
  recordRateLimit,
  rememberFingerprint,
} from '@/lib/messages/guard';
import {
  isMessageCategory,
  normalizeMessageText,
  validateMessageForm,
  type MessageFormInput,
} from '@/lib/messages/shared';
import type { MessageCategory } from '@/types/cms';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const jsonResponse = (payload: unknown, status = 200) => NextResponse.json(payload, {
  status,
  headers: { 'Cache-Control': 'no-store' },
});

const invalid = (message: string, code = 'INVALID_INPUT', status = 400) => jsonResponse({
  error: { code, message },
}, status);

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request.headers)) {
    return invalid('请求来源校验失败，请从官网页面提交。', 'INVALID_ORIGIN', 403);
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(contentLength) && contentLength > 64 * 1024) {
    return invalid('提交内容过大。', 'PAYLOAD_TOO_LARGE', 413);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return invalid('提交数据格式不正确。');
  }

  // 蜜罐字段：正常用户不可见，被填写即判定为机器提交。
  if (normalizeMessageText(body.website)) {
    return invalid('提交未通过校验，请稍后重试。', 'SPAM_REJECTED', 400);
  }

  const elapsed = Number(body.elapsed_ms);
  if (Number.isFinite(elapsed) && elapsed >= 0 && elapsed < 3000) {
    return invalid('提交速度过快，请确认内容后重新提交。', 'SPAM_REJECTED', 400);
  }

  const form: MessageFormInput = {
    name: normalizeMessageText(body.name),
    phone: normalizeMessageText(body.phone),
    email: normalizeMessageText(body.email),
    content: normalizeMessageText(body.content),
    category: (isMessageCategory(body.category) ? body.category : 'other') as MessageCategory,
  };
  const validationError = validateMessageForm(form);
  if (validationError) return invalid(validationError);

  const ip = getClientIp(request.headers);
  const limitChecks = [
    { key: `message:ip:1m:${ip}`, limit: 1, windowMs: 60 * 1000 },
    { key: `message:ip:10m:${ip}`, limit: 3, windowMs: 10 * 60 * 1000 },
    { key: `message:ip:24h:${ip}`, limit: 10, windowMs: 24 * 60 * 60 * 1000 },
    { key: `message:phone:24h:${form.phone}`, limit: 5, windowMs: 24 * 60 * 60 * 1000 },
  ];
  if (limitChecks.some((item) => isRateLimited(item.key, item.limit, item.windowMs))) {
    return invalid('提交过于频繁，请稍后再试。', 'RATE_LIMITED', 429);
  }

  const fingerprint = contentFingerprint(form.phone, form.content);
  if (hasRecentFingerprint(fingerprint)) {
    return invalid('相同内容已提交，请勿重复留言。', 'DUPLICATE', 409);
  }

  try {
    const messages = await listSiteMessages();
    if (findDuplicateMessage(messages, form.phone, form.content)) {
      rememberFingerprint(fingerprint);
      return invalid('相同内容已提交，请勿重复留言。', 'DUPLICATE', 409);
    }

    const created = await createSiteMessage({
      name: form.name,
      phone: form.phone,
      email: form.email,
      category: form.category,
      content: form.content,
      clientIp: ip,
      sourcePath: normalizeMessageText(body.source_path) || '/contact-us',
    });

    limitChecks.forEach((item) => recordRateLimit(item.key));
    rememberFingerprint(fingerprint);

    return jsonResponse({ ok: true, data: { track_code: created.trackCode } }, 201);
  } catch {
    // 不向公网暴露数据接口的原始错误信息。
    return jsonResponse({ error: { code: 'SERVER_ERROR', message: '留言提交失败，请稍后再试。' } }, 502);
  }
}
