'use client';

import { useEffect, useState } from 'react';
import { AdminApi } from '@/lib/admin/admin-api';

type ArticleRow = { id: string; title: string; status: string; publish_at?: string; main_channel?: { name?: string }; related_company?: { id?: string; name?: string } | string | null };
type CompanyRow = { id: string; name: string };
export function ArticleOwnershipManagerPage() {
  const [articles, setArticles] = useState<ArticleRow[]>([]); const [companies, setCompanies] = useState<CompanyRow[]>([]); const [keyword, setKeyword] = useState(''); const [busy, setBusy] = useState(''); const [error, setError] = useState('');
  const load = async () => { try { const result = await AdminApi.articleOwnership() as { data?: { articles?: ArticleRow[]; companies?: CompanyRow[] } }; setArticles(result.data?.articles || []); setCompanies(result.data?.companies || []); } catch (e) { setError(e instanceof Error ? e.message : '加载失败'); } };
  useEffect(() => { void load(); }, []);
  const companyId = (article: ArticleRow) => typeof article.related_company === 'string' ? article.related_company : article.related_company?.id || '';
  const save = async (article: ArticleRow, value: string) => { setBusy(article.id); setError(''); try { await AdminApi.updateArticleOwnership(article.id, value); setArticles((items) => items.map((item) => item.id === article.id ? { ...item, related_company: companies.find((company) => company.id === value) || null } : item)); } catch (e) { setError(e instanceof Error ? e.message : '归属更新失败'); } finally { setBusy(''); } };
  const visible = articles.filter((article) => `${article.title} ${article.main_channel?.name || ''}`.toLowerCase().includes(keyword.toLowerCase()));
  return <section className="admin-page"><header className="admin-page-header"><div><p className="eyebrow">ARTICLE OWNERSHIP</p><h1>文章归属管理</h1><p>现有文章保留集团栏目和原始记录；在确认归属后，可将其关联至对应公司，不会自动复制文章。</p></div></header>
    {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}<div className="admin-card" style={{ padding: 20 }}><input aria-label="搜索文章" placeholder="搜索标题或栏目" value={keyword} onChange={(e) => setKeyword(e.target.value)} /><p>共 {visible.length} / {articles.length} 篇文章</p>
      <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr><th align="left">文章</th><th align="left">集团栏目</th><th align="left">状态</th><th align="left">公司归属（人工确认）</th></tr></thead><tbody>{visible.map((article) => <tr key={article.id} style={{ borderTop: '1px solid #e5e7eb' }}><td style={{ padding: 12 }}>{article.title}</td><td>{article.main_channel?.name || '—'}</td><td>{article.status}</td><td><select disabled={busy === article.id} value={companyId(article)} onChange={(e) => void save(article, e.target.value)}><option value="">集团（未分配公司）</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></td></tr>)}</tbody></table></div>
    </div></section>;
}
