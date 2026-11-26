import { ArrowDownRightIcon, ArrowUpRightIcon, ChartColumnIcon, HourglassIcon } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { HeroScene } from '@/components/landing/hero-scene';
import { SiteHeader } from '@/components/landing/site-header';
import { Logo } from '@/components/logo';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'XCadence · Radar de santé d’équipe tech',
  description:
    'Les métriques DORA et les goulots de votre équipe, calculés depuis GitHub, et un résumé chaque lundi. Open source.',
};

const REPO = 'https://github.com/kuami-labs/xcadence';

/** Extrait du tableau de bord, sur les données du jeu de test (pnpm db:seed). */
const PREVIEW_KPIS: { label: string; value: string; unit: string; change: string; up: boolean }[] =
  [
    { label: 'Déploiements', value: '7,9', unit: '/sem.', change: '+16 %', up: true },
    { label: 'Délai de livraison', value: '18,5', unit: 'h', change: '−21 %', up: false },
    { label: "Taux d'échec", value: '5,8', unit: '%', change: '−15 %', up: false },
    { label: 'Rétablissement', value: '3,1', unit: 'h', change: '−19 %', up: false },
  ];
const PREVIEW_BARS = [31, 29, 30, 27, 25, 26, 22, 21, 20, 19, 18, 17];

const SUMMARY = [
  <>
    L&apos;équipe a déployé <strong>7,9 fois par semaine</strong>, 16 % de plus que sur les 4
    semaines précédentes.
  </>,
  <>
    Le délai de livraison descend à <strong>18,5 h</strong> (−21 %).
  </>,
  <>
    <strong>5,8 %</strong> des déploiements ont échoué, contre 6,8 % avant.
  </>,
  <>
    La production est rétablie en <strong>3,1 h</strong> en moyenne.
  </>,
  <>
    <strong>4 PR</strong> attendent une revue depuis plus de 48 h.
  </>,
];

export default function LandingPage() {
  return (
    <div className="min-h-svh">
      <SiteHeader />
      <main>
        <Hero />
        <Metrics />
        <HowItWorks />
        <WeeklyEmail />
        <Principles />
        <OpenSource />
        <FinalCall />
      </main>
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <HeroScene />
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-7 px-5 pt-12 text-center sm:pt-20">
        <a
          href="#open-source"
          className="inline-flex items-center gap-2 rounded-full border bg-card py-1 pr-3 pl-1 text-[13px] shadow-sm"
        >
          <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
            Open source
          </span>
          Licence AGPL-3.0, auto-hébergeable
        </a>
        <h1 className="max-w-3xl text-[clamp(2.1rem,7vw,3.5rem)] leading-[1.05] font-semibold tracking-[-0.045em] text-balance">
          La santé de votre équipe tech, lue en cinq minutes par semaine.
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground">
          XCadence calcule les métriques DORA et repère les goulots directement depuis GitHub.
          Chaque lundi, un résumé de cinq lignes dit au CTO ce qui a changé.
        </p>
        <div className="flex flex-wrap justify-center gap-2.5">
          <Link href="/login" className={buttonVariants({ className: 'h-11 px-5 text-sm' })}>
            Connecter GitHub
          </Link>
          <Link
            href="/demo"
            className={buttonVariants({ variant: 'outline', className: 'h-11 px-5 text-sm' })}
          >
            Explorer la démo publique
          </Link>
        </div>
        <p className="text-[13px] text-muted-foreground">
          Lecture seule · aucune ligne de code stockée · installation en deux minutes
        </p>
        <div className="mt-8 w-full [perspective:1800px]">
          <div className="[transform:rotateX(14deg)] rounded-3xl border bg-muted p-2.5 text-left shadow-[0_40px_80px_-30px_rgb(8_48_160/0.35)] [transform-origin:50%_100%]">
            <ProductPreview />
          </div>
        </div>
      </div>
    </section>
  );
}

/** Aperçu statique du tableau de bord, dans les couleurs du thème. */
function ProductPreview() {
  return (
    <figure className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b bg-muted px-4 py-2.5">
        {[0, 1, 2].map((i) => (
          <span key={i} aria-hidden className="size-2.5 rounded-full bg-border" />
        ))}
        <span className="ml-3 font-mono text-xs text-muted-foreground">
          xcadence · Vue d&apos;ensemble · jeu de test
        </span>
      </div>
      <div className="grid grid-cols-2 gap-px border-b bg-border lg:grid-cols-4">
        {PREVIEW_KPIS.map((k) => {
          const Arrow = k.up ? ArrowUpRightIcon : ArrowDownRightIcon;
          return (
            <div key={k.label} className="flex flex-col gap-1.5 bg-card px-5 py-4">
              <span className="text-[13px] font-medium text-muted-foreground">{k.label}</span>
              <span className="flex items-baseline gap-1">
                <span className="text-2xl font-semibold tracking-tight tabular-nums">
                  {k.value}
                </span>
                <span className="text-sm text-muted-foreground">{k.unit}</span>
              </span>
              <span className="flex items-center gap-1 text-xs">
                <Arrow aria-hidden className="size-3.5 text-chart-3" />
                <span className="font-medium tabular-nums">{k.change}</span>
                <span className="text-muted-foreground">vs 4 sem. préc.</span>
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-col gap-3 px-5 pt-5 pb-4">
        <span className="text-sm font-semibold">
          Délai de livraison par semaine{' '}
          <span className="font-normal text-muted-foreground">· médiane, en heures</span>
        </span>
        <div
          role="img"
          aria-label="Délai de livraison : de 31 h à 17 h en 12 semaines"
          className="flex h-36 items-end gap-2 border-b sm:h-40 sm:gap-2.5"
        >
          {PREVIEW_BARS.map((v, i) => (
            <div
              key={i}
              className={cn(
                'flex-1 rounded-t-md rounded-b-[2px]',
                i >= 8 ? 'bg-bar-current' : 'bg-bar-past',
              )}
              style={{ height: `${(v / 35) * 100}%` }}
            />
          ))}
        </div>
      </div>
      <figcaption className="sr-only">
        Tableau de bord de XCadence sur le jeu de test : données fictives.
      </figcaption>
    </figure>
  );
}

function SectionTitle({
  index,
  title,
  children,
}: {
  index: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex max-w-2xl flex-col gap-3">
      <span className="font-mono text-[13px] text-primary">{index}</span>
      <h2 className="text-[clamp(1.6rem,4.5vw,2.25rem)] leading-tight font-semibold tracking-[-0.035em] text-balance">
        {title}
      </h2>
      {children ? (
        <p className="text-base leading-relaxed text-muted-foreground">{children}</p>
      ) : null}
    </div>
  );
}

function Section({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn('mx-auto flex max-w-6xl scroll-mt-20 flex-col gap-10 px-5 pt-28', className)}
    >
      {children}
    </section>
  );
}

const DORA = [
  {
    group: 'Débit',
    title: 'Fréquence de déploiement',
    text: 'Combien de fois par semaine l’équipe met en production. Vous choisissez quels environnements comptent.',
  },
  {
    group: 'Débit',
    title: 'Délai de livraison',
    text: 'Temps entre le premier commit d’une PR et son déploiement en production.',
  },
  {
    group: 'Stabilité',
    title: "Taux d'échec des changements",
    text: 'Part des déploiements en échec, ou annulés par un rollback sous 48 h.',
  },
  {
    group: 'Stabilité',
    title: 'Temps de rétablissement',
    text: 'Durée entre un déploiement en échec et le déploiement réussi suivant.',
  },
];

function Metrics() {
  return (
    <Section id="metriques">
      <SectionTitle
        index="01 · Ce que XCadence mesure"
        title="Les quatre métriques DORA, calculées depuis vos vraies données."
      >
        Par dépôt et par semaine, avec leur tendance. Les définitions sont publiques et le calcul
        est testé sur des données fixes.
      </SectionTitle>
      <div className="grid gap-px overflow-hidden rounded-xl border bg-border shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        {DORA.map((m) => (
          <div key={m.title} className="flex flex-col gap-2.5 bg-card p-7">
            <span className="font-mono text-xs text-muted-foreground">{m.group}</span>
            <h3 className="text-[17px] font-semibold tracking-tight">{m.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{m.text}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Feature icon={<HourglassIcon />} title="Les goulots, nommés">
          PR qui attendent une revue depuis plus de 48 h, PR ouvertes depuis plus de 7 jours, CI
          lente ou instable sur la branche principale.
        </Feature>
        <Feature icon={<ChartColumnIcon />} title="Le flux, en détail">
          Temps avant la première revue, durée de vie des PR, durée de la CI en médiane et au 90ᵉ
          centile, pour chaque dépôt.
        </Feature>
      </div>
    </Section>
  );
}

function Feature({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-4 rounded-xl border bg-card p-6 shadow-sm">
      <span aria-hidden className="mt-0.5 text-primary [&_svg]:size-5">
        {icon}
      </span>
      <div className="flex flex-col gap-1.5">
        <h3 className="text-[15px] font-semibold">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    {
      title: 'Installez la GitHub App',
      text: 'En lecture seule, sur les dépôts que vous choisissez. Elle lit des métadonnées : dates, tailles, statuts.',
    },
    {
      title: '90 jours sont importés',
      text: 'PR, revues, runs de CI et déploiements. Les webhooks signés tiennent ensuite tout à jour, et les métriques sont recalculées chaque nuit.',
    },
    {
      title: 'Le résumé arrive le lundi',
      text: 'Cinq lignes par email, et le tableau de bord pour creuser quand une tendance change.',
    },
  ];
  return (
    <Section id="fonctionnement">
      <SectionTitle
        index="02 · Fonctionnement"
        title="Deux minutes pour installer, puis plus rien à faire."
      />
      <ol className="grid gap-8 md:grid-cols-3">
        {steps.map((step, i) => (
          <li
            key={step.title}
            className={cn('flex flex-col gap-3 border-t-2 pt-5', i === 0 && 'border-primary')}
          >
            <span className="font-mono text-[13px] text-muted-foreground">Étape {i + 1}</span>
            <h3 className="text-[17px] font-semibold">{step.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{step.text}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

function WeeklyEmail() {
  return (
    <Section className="md:flex-row md:items-center md:gap-12">
      <div className="flex flex-1 flex-col gap-4">
        <SectionTitle
          index="03 · Le résumé du lundi"
          title="Rédigé par une IA, vérifié chiffre par chiffre."
        >
          Le modèle ne reçoit que les métriques agrégées de la semaine. Chaque nombre de sa réponse
          est comparé aux données ; au moindre écart, XCadence envoie un résumé écrit sans IA.
        </SectionTitle>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Compatible avec Claude ou toute API compatible OpenAI. Sans clé, le résumé reste
          disponible.
        </p>
      </div>
      <figure className="flex-1 overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex flex-col gap-1 border-b bg-muted px-5 py-3.5 text-[13px]">
          <span>
            <span className="text-muted-foreground">De</span> XCadence
          </span>
          <span>
            <span className="text-muted-foreground">Objet</span>{' '}
            <span className="font-medium">acme · semaine du 16 novembre</span>
          </span>
        </div>
        <ul className="px-5 py-2 text-sm leading-relaxed [&_strong]:font-semibold">
          {SUMMARY.map((line, i) => (
            <li key={i} className={cn('py-2.5', i > 0 && 'border-t')}>
              {line}
            </li>
          ))}
        </ul>
        <figcaption className="border-t px-5 py-2.5 text-xs text-muted-foreground">
          Exemple sur le jeu de test : organisation et chiffres fictifs.
        </figcaption>
      </figure>
    </Section>
  );
}

function Principles() {
  const items = [
    {
      title: 'Aucun classement individuel',
      text: 'Les métriques décrivent l’équipe et le processus. Aucun tableau ne compare des développeurs entre eux.',
    },
    {
      title: 'Aucun code source stocké',
      text: 'Seulement des métadonnées : dates, tailles, statuts. Le contenu de vos dépôts ne quitte pas GitHub.',
    },
    {
      title: 'Lecture seule',
      text: 'La GitHub App ne peut rien écrire. Chaque webhook est vérifié par signature avant d’être traité.',
    },
    {
      title: 'Vos données restent séparées',
      text: 'Chaque requête est filtrée par organisation. Les dépôts privés n’apparaissent jamais dans la démo publique.',
    },
  ];
  return (
    <Section id="principes">
      <SectionTitle
        index="04 · Principes"
        title="Un outil pour l’équipe, pas pour surveiller les personnes."
      />
      <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.title} className="flex flex-col gap-2">
            <h3 className="text-[15px] font-semibold">{item.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{item.text}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function OpenSource() {
  return (
    <Section id="open-source">
      <div className="grid gap-px overflow-hidden rounded-2xl border bg-border shadow-sm md:grid-cols-2">
        <div className="flex flex-col gap-4 bg-card p-6 sm:p-10">
          <span className="font-mono text-[13px] text-primary">05 · Open source</span>
          <h2 className="text-[clamp(1.5rem,4vw,2rem)] leading-tight font-semibold tracking-[-0.035em]">
            Lisez le code. Hébergez-le chez vous.
          </h2>
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            XCadence est publié sous licence AGPL-3.0. Un dev container suffit pour le lancer :
            Node, PostgreSQL et Redis viennent du dépôt, avec un jeu de test de 90 jours.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <a
              href={REPO}
              className={buttonVariants({ variant: 'outline', className: 'h-9 px-3.5' })}
            >
              kuami-labs/xcadence
            </a>
            <a
              href={`${REPO}#documentation`}
              className={buttonVariants({ variant: 'ghost', className: 'h-9 px-3.5' })}
            >
              Lire la documentation
            </a>
          </div>
        </div>
        <div className="flex items-center bg-muted p-5 sm:p-8">
          <pre className="w-full overflow-x-auto rounded-lg border bg-card p-5 font-mono text-[13px] leading-loose">
            <span className="text-muted-foreground"># dans le dev container</span>
            {'\n'}pnpm db:migrate{'\n'}pnpm db:seed{'   '}
            <span className="text-muted-foreground"># 90 jours d&apos;activité fictive</span>
            {'\n'}pnpm dev{'\n\n'}
            <span className="text-muted-foreground"># puis</span> http://localhost:3000/demo
          </pre>
        </div>
      </div>
    </Section>
  );
}

function FinalCall() {
  return (
    <Section className="items-center pb-24 text-center">
      <h2 className="max-w-2xl text-[clamp(1.75rem,6vw,2.5rem)] leading-tight font-semibold tracking-[-0.04em] text-balance">
        Votre premier résumé arrive lundi prochain.
      </h2>
      <p className="-mt-6 text-muted-foreground">
        Connectez GitHub, choisissez vos dépôts : le reste est automatique.
      </p>
      <div className="-mt-2 flex flex-wrap justify-center gap-2.5">
        <Link href="/login" className={buttonVariants({ className: 'h-11 px-5 text-sm' })}>
          Connecter GitHub
        </Link>
        <Link
          href="/demo"
          className={buttonVariants({ variant: 'outline', className: 'h-11 px-5 text-sm' })}
        >
          Explorer la démo publique
        </Link>
      </div>
    </Section>
  );
}

function Footer() {
  const links = [
    { href: REPO, label: 'GitHub' },
    { href: `${REPO}#documentation`, label: 'Documentation' },
    { href: `${REPO}/blob/develop/SECURITY.md`, label: 'Sécurité' },
    { href: `${REPO}/blob/develop/CONTRIBUTING.md`, label: 'Contribuer' },
  ];
  return (
    <footer className="border-t bg-muted">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-7 text-[13px]">
        <span className="flex items-center gap-2">
          <Logo />
          <span className="text-muted-foreground">· AGPL-3.0</span>
        </span>
        <nav aria-label="Pied de page" className="flex flex-wrap gap-5">
          {links.map((l) => (
            <a key={l.label} href={l.href} className="text-muted-foreground hover:text-foreground">
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
