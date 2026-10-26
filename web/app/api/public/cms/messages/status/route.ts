import { NextResponse, type NextRequest } from 'next/server';
import { findMessageByTrackCode, listSiteMessages } from '@/lib/cms/messages';
import { getClientIp, isRateLimited, recordRateLimit } from '@/lib/messages/guard';
import { messageStatusLabel, normalizeMessageText } from '@/lib/messages/shared';
import type { SiteMessageStatusView } from '@/types/cms';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const jsonResponse = (payload: unknown, status = 200) => NextResponse.json(payload, {
  status,
  headers: { 'Cache-Control': 'no-store' },
});

const notFound = () => jsonResponse({
  error: { code: 'NOT_FOUND', message: '未查询到对应留言，请核对查询码与手机号后四位。' },
}, 404);

export async function GET(request: NextRequest) {
  const code = normalizeMessageText(request.nextUrl.searchParams.get('code')).toUpperCase();
  const phoneTail = normalizeMessageText(request.nextUrl.searchParams.get('phone_tail'));

  if (!/^[A-Z2-9]{6,12}$/.test(code) || !/^\d{4}$/.test(phoneTail)) {
    return jsonResponse({
      error: { code: 'INVALID_INPUT', message: '请填写正确的查询码和手机号后四位。' },
    }, 400);
  }

  const ip = getClientIp(request.headers);
  const limitKey = `message:status:ip:${ip}`;
  if (isRateLimited(limitKey, 10, 60 * 1000)) {
    return jsonResponse({
      error: { code: 'RATE_LIMITED', message: '查询过于频繁，请稍后再试。' },
    }, 429);
  }
  // 成功与失败查询都计数，防止通过枚举查询码探测记录。
  recordRateLimit(limitKey);

  try {
    const messages = await listSiteMessages();
    const message = findMessageByTrackCode(messages, code, phoneTail);
    if (!message) return notFound();

    const view: SiteMessageStatusView = {
      status: message.status,
      statusLabel: messageStatusLabel(message.status),
      createdAt: message.createdAt,
      handledAt: message.handledAt,
      reply: message.reply,
    };
    return jsonResponse({ data: view });
  } catch {
    return jsonResponse({
      error: { code: 'SERVER_ERROR', message: '查询失败，请稍后再试。' },
    }, 502);
  }
}
