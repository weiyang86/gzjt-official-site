import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/** 一级栏目「集团概况」点击后直达首个子栏目「企业简介」，不再展示栏目聚合页。 */
export default function Page() {
  redirect('/about/profile');
}
