'use client';

import { BottlenecksView } from '@/components/bottlenecks/bottlenecks-view';
import { DemoBanner } from '@/components/demo-banner';
import { useDemo, useDemoBottlenecks } from '@/hooks/use-demo';
import { NoDemo } from '../demo-dashboard';

/** Goulots de la démo publique : sans session, lecture seule. */
export default function DemoBottlenecksPage() {
  const demo = useDemo();
  const bottlenecks = useDemoBottlenecks();

  if (demo.isPending) return <p className="p-8 text-muted-foreground">Chargement…</p>;
  if (demo.isError || bottlenecks.isError) return <NoDemo />;
  return (
    <>
      <DemoBanner organization={demo.data.organization.name} />
      <BottlenecksView subtitle={demo.data.organization.name} data={bottlenecks.data} />
    </>
  );
}
