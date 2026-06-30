import type { Metadata } from 'next';
import { AdminShell } from '../components/AdminShell';
import { UserDetails } from './UserDetails';

export const metadata: Metadata = {
  title: '工作台 - 甘孜建设投资集团官网内容管理后台',
};

export default function AdminDashboardPage() {
  return (
    <AdminShell active="dashboard">
      <main className="dashboard-content">
        <section className="notice-card" aria-labelledby="news-help-title">
          <p className="eyebrow">工作台</p>
          <h2 id="news-help-title">后台迁移说明</h2>
          <p>本后台用于官网内容维护。当前第一批已接入 Next.js 后台基础骨架，登录态和数据请求继续通过同源 <code>/admin-api/*</code> 访问服务端代理。</p>
          <ul className="plain-list">
            <li>请使用自己的 Directus 内容账号登录，不共用管理员账号。</li>
            <li>浏览器端不保存、不硬编码、不透传 Directus Token。</li>
            <li>官网前台仅展示已发布内容，草稿和归档内容不会展示给公众。</li>
          </ul>
        </section>

        <section className="dashboard-grid" aria-label="快捷入口">
          <article className="quick-card">
            <span className="quick-icon">新</span>
            <h3>新闻管理</h3>
            <p>查看新闻列表、筛选栏目和状态。</p>
            <a className="secondary-button" href="/admin/articles">进入管理</a>
          </article>
          <article className="quick-card">
            <span className="quick-icon">加</span>
            <h3>新增新闻</h3>
            <p>创建草稿、上传封面、填写正文并提交发布。</p>
            <a className="secondary-button" href="/admin/article-edit">新增新闻</a>
          </article>
          <article className="quick-card">
            <span className="quick-icon">类</span>
            <h3>新闻分类</h3>
            <p>维护新闻栏目名称、标识、排序和启停状态。</p>
            <a className="text-link" href="/admin/categories">管理分类</a>
          </article>
          <article className="quick-card">
            <span className="quick-icon">告</span>
            <h3>公示公告</h3>
            <p>维护公示公告列表、分类和编辑入口。</p>
            <a className="text-link" href="/admin/notice-articles">进入公告管理</a>
          </article>
          <article className="quick-card">
            <span className="quick-icon">页</span>
            <h3>页面内容管理</h3>
            <p>管理一级栏目下的二级页面占位项和内容模块。</p>
            <a className="text-link" href="/admin/content">进入页面内容管理</a>
          </article>
          <article className="quick-card">
            <span className="quick-icon">权</span>
            <h3>权限说明</h3>
            <p>Directus 继续控制账号可读写范围，普通客户账号不管理数据模型。</p>
            <a className="text-link" href="/admin/login">返回登录页</a>
          </article>
        </section>

        <section className="user-card" aria-labelledby="user-title">
          <div>
            <p className="eyebrow">当前登录用户</p>
            <h2 id="user-title">账号信息</h2>
          </div>
          <UserDetails />
        </section>
      </main>
    </AdminShell>
  );
}
