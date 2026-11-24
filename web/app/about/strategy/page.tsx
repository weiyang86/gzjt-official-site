import { ModuleSinglePage } from '@/app/site-pages';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <ModuleSinglePage
      moduleCode="group-strategy"
      fallbackTitle="发展战略"
      kicker="DEVELOPMENT STRATEGY"
      active="about"
      parent={{ title: '集团概况', href: '/about/profile' }}
    />
  );
}
