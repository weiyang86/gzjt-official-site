'use client';

import { useRef, useState, type CSSProperties, type FormEvent } from 'react';
import {
  formatMessageDate,
  messageCategoryOptions,
  messageLimits,
  messageStatusTone,
  validateMessageForm,
} from '@/lib/messages/shared';
import type { MessageCategory, SiteMessageStatusView } from '@/types/cms';

type MessageForm = {
  name: string;
  phone: string;
  email: string;
  category: MessageCategory;
  content: string;
};

const emptyForm: MessageForm = {
  name: '',
  phone: '',
  email: '',
  category: 'consult',
  content: '',
};

const labelStyle: CSSProperties = { display: 'block', fontWeight: 800, marginBottom: 8 };
const requiredStyle: CSSProperties = { color: '#b42318' };
const errorStyle: CSSProperties = { color: '#b42318', fontSize: 14 };
const tipStyle: CSSProperties = { marginTop: 12, color: '#5b6572', fontSize: 13, lineHeight: 1.7 };

export function MessageSection() {
  const [form, setForm] = useState<MessageForm>(emptyForm);
  const [website, setWebsite] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptCode, setReceiptCode] = useState('');
  const [queryCode, setQueryCode] = useState('');
  const [queryTail, setQueryTail] = useState('');
  const [queryError, setQueryError] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryResult, setQueryResult] = useState<SiteMessageStatusView | null>(null);
  const startedAt = useRef(Date.now());

  const setField = <K extends keyof MessageForm>(key: K, value: MessageForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    const error = validateMessageForm(form);
    if (error) {
      setFormError(error);
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/public/cms/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          website,
          elapsed_ms: Date.now() - startedAt.current,
          source_path: '/contact-us',
        }),
      });
      const payload = await response.json() as { data?: { track_code?: string }; error?: { message?: string } };
      if (!response.ok || !payload.data?.track_code) {
        throw new Error(payload.error?.message || '留言提交失败，请稍后再试。');
      }
      setReceiptCode(payload.data.track_code);
      setQueryCode(payload.data.track_code);
      setForm(emptyForm);
      setWebsite('');
      startedAt.current = Date.now();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '留言提交失败，请稍后再试。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuery = async (event: FormEvent) => {
    event.preventDefault();
    setQueryError('');
    setQueryResult(null);
    if (!/^[A-Za-z2-9]{6,12}$/.test(queryCode.trim())) {
      setQueryError('请填写 8 位查询码。');
      return;
    }
    if (!/^\d{4}$/.test(queryTail.trim())) {
      setQueryError('请填写手机号后四位。');
      return;
    }
    setIsQuerying(true);
    try {
      const params = new URLSearchParams({ code: queryCode.trim().toUpperCase(), phone_tail: queryTail.trim() });
      const response = await fetch(`/api/public/cms/messages/status?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json() as { data?: SiteMessageStatusView; error?: { message?: string } };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message || '未查询到对应留言。');
      }
      setQueryResult(payload.data);
    } catch (err) {
      setQueryError(err instanceof Error ? err.message : '查询失败，请稍后再试。');
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <section className="section" id="message" aria-label="在线留言">
      <div className="content">
        <div className="section-head reveal is-visible">
          <div>
            <div className="kicker"><i aria-hidden="true" /><span>MESSAGE</span></div>
            <div className="h2">在线留言</div>
            <p className="lead">欢迎留下咨询、建议、投诉或举报。提交后请保存查询码，可凭查询码和手机号后四位查询办理进度。</p>
          </div>
        </div>

        <div className="two-col">
          <div className="col-7 reveal is-visible">
            <div className="detail">
              <form onSubmit={handleSubmit} noValidate>
                <div className="grid" style={{ gap: 14 }}>
                  <div style={{ gridColumn: 'span 6' }}>
                    <label htmlFor="message-name" style={labelStyle}>姓名 <span style={requiredStyle}>*</span></label>
                    <input
                      id="message-name"
                      className="input"
                      value={form.name}
                      maxLength={messageLimits.name}
                      required
                      onChange={(event) => setField('name', event.target.value)}
                    />
                  </div>
                  <div style={{ gridColumn: 'span 6' }}>
                    <label htmlFor="message-phone" style={labelStyle}>手机号 <span style={requiredStyle}>*</span></label>
                    <input
                      id="message-phone"
                      className="input"
                      inputMode="tel"
                      value={form.phone}
                      maxLength={11}
                      required
                      onChange={(event) => setField('phone', event.target.value.replace(/[^\d]/g, ''))}
                    />
                  </div>
                  <div style={{ gridColumn: 'span 6' }}>
                    <label htmlFor="message-email" style={labelStyle}>邮箱（选填）</label>
                    <input
                      id="message-email"
                      className="input"
                      type="email"
                      value={form.email}
                      maxLength={messageLimits.email}
                      onChange={(event) => setField('email', event.target.value)}
                    />
                  </div>
                  <div style={{ gridColumn: 'span 6' }}>
                    <label htmlFor="message-category" style={labelStyle}>留言类型 <span style={requiredStyle}>*</span></label>
                    <select
                      id="message-category"
                      className="input"
                      value={form.category}
                      onChange={(event) => setField('category', event.target.value as MessageCategory)}
                    >
                      {messageCategoryOptions.map((option) => (
                        <option value={option.value} key={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ gridColumn: 'span 12' }}>
                    <label htmlFor="message-content" style={labelStyle}>留言内容 <span style={requiredStyle}>*</span></label>
                    <textarea
                      id="message-content"
                      className="textarea"
                      rows={6}
                      value={form.content}
                      maxLength={messageLimits.content}
                      required
                      placeholder={`请填写 ${messageLimits.minContent}-${messageLimits.content} 个字符`}
                      onChange={(event) => setField('content', event.target.value)}
                    />
                  </div>
                </div>

                <input
                  type="text"
                  name="website"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  style={{ display: 'none' }}
                />

                <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button className="btn btn--primary" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? '正在提交...' : '提交留言'}
                  </button>
                  {formError ? <span style={errorStyle}>{formError}</span> : null}
                </div>
                <p style={tipStyle}>请勿在留言中填写身份证号、银行卡号等敏感信息。提交记录仅在后台受理，不会公开展示。</p>

                {receiptCode ? (
                  <div className="card" style={{ marginTop: 18 }}>
                    <div className="card-pad">
                      <strong>留言已提交</strong>
                      <p style={{ marginTop: 8 }}>
                        查询码：<strong style={{ letterSpacing: 2 }}>{receiptCode}</strong>
                      </p>
                      <p style={{ marginTop: 6, color: '#5b6572', fontSize: 13 }}>
                        请保存查询码，在右侧输入查询码和手机号后四位查询办理进度。
                      </p>
                    </div>
                  </div>
                ) : null}
              </form>
            </div>
          </div>

          <div className="col-5 reveal is-visible">
            <div className="card">
              <div className="card-pad">
                <div className="pill">进度查询</div>
                <p style={{ marginTop: 12, color: '#5b6572', fontSize: 14, lineHeight: 1.7 }}>
                  请输入提交成功后获得的查询码与手机号后四位。
                </p>
                <form onSubmit={handleQuery} noValidate>
                  <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
                    <label htmlFor="message-query-code" style={labelStyle}>查询码</label>
                    <input
                      id="message-query-code"
                      className="input"
                      value={queryCode}
                      maxLength={12}
                      placeholder="例如 A7K2M9QX"
                      onChange={(event) => setQueryCode(event.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ''))}
                    />
                    <label htmlFor="message-query-tail" style={labelStyle}>手机号后四位</label>
                    <input
                      id="message-query-tail"
                      className="input"
                      inputMode="numeric"
                      value={queryTail}
                      maxLength={4}
                      onChange={(event) => setQueryTail(event.target.value.replace(/[^\d]/g, ''))}
                    />
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <button className="btn" type="submit" disabled={isQuerying}>
                      {isQuerying ? '正在查询...' : '查询办理进度'}
                    </button>
                  </div>
                  {queryError ? <p style={{ ...errorStyle, marginTop: 10 }}>{queryError}</p> : null}
                </form>

                {queryResult ? (
                  <div style={{ marginTop: 16, borderTop: '1px solid rgba(15, 31, 51, .1)', paddingTop: 14 }}>
                    <span className="pill" style={messageStatusTone(queryResult.status)}>{queryResult.statusLabel}</span>
                    <p style={{ marginTop: 10, fontSize: 14 }}>提交时间：{formatMessageDate(queryResult.createdAt)}</p>
                    {queryResult.handledAt ? (
                      <p style={{ marginTop: 4, fontSize: 14 }}>处理时间：{formatMessageDate(queryResult.handledAt)}</p>
                    ) : null}
                    {queryResult.reply ? (
                      <div style={{ marginTop: 12 }}>
                        <strong>办理回复</strong>
                        <p className="rich" style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{queryResult.reply}</p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
