'use client';

import { BottlenecksView } from '@/components/bottlenecks/bottlenecks-view';
import { DemoBanner } from '@/components/demo-banner';
import { PageBody, PageState } from '@/components/page-header';
import { useDemo, useDemoBottlenecks } from '@/hooks/use-demo';
import { NoDemo } from '../demo-dashboard';

/** Goulots de la démo publique : sans session, lecture seule. */
export function DemoBottlenecks() {
  const demo = useDemo();
  const bottlenecks = useDemoBottlenecks();

  if (demo.isPending)
    return (
      <PageBody>
        <PageState>Chargement…</PageState>
      </PageBody>
    );
  if (demo.isError) return <NoDemo />;
  return (
    <BottlenecksView
      subtitle={`${demo.data.organization.name} · démo publique`}
      notice={<DemoBanner organization={demo.data.organization.name} />}
      data={bottlenecks.data}
      error={bottlenecks.isError}
    />
  );
}
