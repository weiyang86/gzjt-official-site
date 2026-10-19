import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function PartyMassesPage() {
  // 临时栏目归并：保留旧路由兼容，统一进入新闻中心的党建群团栏目。
  // 恢复独立页时，改回 `return <GenericSinglePage slug="party" />`。
  redirect('/news?channel=party-mass');
}
