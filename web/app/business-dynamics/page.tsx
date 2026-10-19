import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function BusinessDynamicsPage() {
  // 临时栏目归并：保留旧路由兼容，统一进入新闻中心的业务动态栏目。
  // 恢复独立页时，改回 `return <GenericSinglePage slug="businessDynamics" />`。
  redirect('/news?channel=business-news');
}
