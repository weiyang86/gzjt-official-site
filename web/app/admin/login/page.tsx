import type { Metadata } from 'next';
import { LoginForm } from '../components/LoginForm';

export const metadata: Metadata = {
  title: '登录 - 甘孜建设投资集团官网内容管理后台',
};

export default function AdminLoginPage() {
  return (
    <main className="admin-login-page">
      <div className="login-shell" aria-labelledby="login-title">
        <section className="login-card">
          <div className="login-brand">
            <p className="eyebrow">Ganzi Construction Investment Group</p>
            <h1 id="login-title">甘孜建设投资集团官网内容管理后台</h1>
            <p className="login-desc">用于新闻上传与内容管理，请使用分配的 Directus 内容账号登录。</p>
          </div>

          <LoginForm />

          <p className="login-tip">登录遇到问题，请联系系统管理员，不要在聊天工具或邮件中发送密码。</p>
        </section>
      </div>
    </main>
  );
}
