'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AdminApi } from '@/lib/admin/admin-api';

type LoginFormProps = {
  ssoKey?: string;
  targetUrl?: string;
};

export function LoginForm({ ssoKey = '', targetUrl = '' }: LoginFormProps) {
  const router = useRouter();
  const ssoStarted = useRef(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!ssoKey || ssoStarted.current) return;
    ssoStarted.current = true;
    window.history.replaceState(null, '', '/admin/login');
    setIsSubmitting(true);
    setError('');
    void (async () => {
      try {
        const result = await AdminApi.ssoLogin(ssoKey, targetUrl);
        await AdminApi.me();
        router.replace(result.data?.targetUrl || '/admin');
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : '单点登录失败，请重新获取登录链接。');
        setIsSubmitting(false);
      }
    })();
  }, [router, ssoKey, targetUrl]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      setError('请输入邮箱和密码。');
      return;
    }

    setIsSubmitting(true);
    try {
      await AdminApi.login(normalizedEmail, password);
      await AdminApi.me();
      router.push('/admin/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请检查账号密码。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="login-form" noValidate onSubmit={handleSubmit}>
      <div className="form-field">
        <label htmlFor="email">邮箱</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="请输入邮箱"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div className="form-field">
        <label htmlFor="password">密码</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="请输入密码"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {ssoKey && isSubmitting ? <p className="login-tip" role="status">正在通过单点登录验证身份...</p> : null}
      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? '正在登录...' : '登录'}
      </button>
    </form>
  );
}
