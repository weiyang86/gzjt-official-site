import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function PartyPage() {
  // 兼容历史 /party 地址；恢复独立页时改回 GenericSinglePage。
  redirect('/news?channel=party-mass');
}
