import { ModuleSinglePage } from '@/app/site-pages';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <ModuleSinglePage
      moduleCode="party-building"
      fallbackTitle="党建引领"
      kicker="PARTY BUILDING"
      active="partyMasses"
      parent={{ title: '党建群团', href: '/news?channel=party-mass' }}
    />
  );
}
