'use client';

import { Dialog } from '@base-ui/react/dialog';
import { useQueryClient } from '@tanstack/react-query';
import {
  ChartColumnIcon,
  HourglassIcon,
  LogOutIcon,
  MenuIcon,
  SettingsIcon,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Logo } from '@/components/logo';
import { ThemeSwitch } from '@/components/theme-toggle';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDemo } from '@/hooks/use-demo';
import { useMe } from '@/hooks/use-me';
import { apiFetch, loginUrl } from '@/lib/api/client';
import { cn } from '@/lib/utils';

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Autres débuts de chemin qui rendent le lien actif (détail d'un dépôt → vue d'ensemble). */
  also?: string[];
}

const LINKS: NavLink[] = [
  { href: '/dashboard', label: "Vue d'ensemble", icon: ChartColumnIcon, also: ['/repositories'] },
  { href: '/bottlenecks', label: 'Goulots', icon: HourglassIcon },
  { href: '/settings', label: 'Paramètres', icon: SettingsIcon },
];

/** Démo publique : seulement ses pages, sans session (ADR 0006). */
const DEMO_LINKS: NavLink[] = [
  { href: '/demo', label: "Vue d'ensemble", icon: ChartColumnIcon },
  { href: '/demo/bottlenecks', label: 'Goulots', icon: HourglassIcon },
];

const ROLE = { owner: 'Propriétaire', member: 'Membre' } as const;

const isDemoPath = (pathname: string) => pathname === '/demo' || pathname.startsWith('/demo/');

/** Contenu de la navigation, partagé par la barre latérale et le menu mobile. */
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const org = useSearchParams().get('org');
  const demo = isDemoPath(pathname);
  const links = demo ? DEMO_LINKS : LINKS;
  // Garde l'organisation choisie (?org=) d'une page à l'autre.
  const withOrg = (href: string) => (org && !demo ? `${href}?org=${org}` : href);
  const isActive = (link: NavLink) =>
    pathname === link.href || (link.also ?? []).some((p) => pathname.startsWith(p));

  return (
    <nav aria-label="Navigation principale" className="flex min-h-full flex-col gap-6 px-3 py-5">
      <Link
        href={withOrg(links[0].href)}
        onClick={onNavigate}
        className="rounded-md px-1.5 py-0.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Logo />
      </Link>

      {demo ? <DemoBlock /> : <OrganizationSwitcher />}

      <ul className="flex flex-col gap-0.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={withOrg(link.href)}
              onClick={onNavigate}
              aria-current={isActive(link) ? 'page' : undefined}
              className="flex min-h-9 items-center gap-2.5 rounded-md px-2.5 text-sm outline-none hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-medium aria-[current=page]:text-sidebar-accent-foreground"
            >
              <link.icon className="size-4" aria-hidden />
              {link.label}
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-col gap-1">
        <ThemeSwitch />
        {demo ? (
          <a
            href={loginUrl()}
            className={cn(buttonVariants({ variant: 'default' }), 'mt-2 h-9 w-full')}
          >
            Se connecter avec GitHub
          </a>
        ) : (
          <Account />
        )}
      </div>
    </nav>
  );
}

/** Organisation affichée ; un sélecteur quand l'utilisateur en a plusieurs. */
function OrganizationSwitcher() {
  const me = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const organizations = me.data?.organizations ?? [];
  if (organizations.length === 0) return null;
  const current = organizations.find((o) => o.id === params.get('org')) ?? organizations[0];

  if (organizations.length === 1) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border bg-card px-2.5 py-2 shadow-sm">
        <Initial name={current.name} />
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-medium">{current.name}</span>
          <span className="text-xs text-muted-foreground">{ROLE[current.role]}</span>
        </span>
      </div>
    );
  }
  return (
    <Select
      value={current.id}
      onValueChange={(id) => router.replace(`${pathname}?org=${id as string}`)}
    >
      <SelectTrigger aria-label="Organisation" className="h-auto w-full bg-card py-2 shadow-sm">
        <SelectValue>
          {(id: string) => {
            const o = organizations.find((x) => x.id === id) ?? current;
            return (
              <span className="flex min-w-0 items-center gap-2.5">
                <Initial name={o.name} />
                <span className="truncate font-medium">{o.name}</span>
              </span>
            );
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {organizations.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function DemoBlock() {
  const demo = useDemo();
  return (
    <div className="flex items-center gap-2.5 rounded-lg border bg-card px-2.5 py-2 shadow-sm">
      <Initial name={demo.data?.organization.name ?? 'D'} />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm font-medium">
          {demo.data?.organization.name ?? 'Démo'}
        </span>
        <span className="text-xs text-muted-foreground">Démo publique · lecture seule</span>
      </span>
    </div>
  );
}

/** Compte connecté et déconnexion (POST /auth/logout). */
function Account() {
  const me = useMe();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  if (!me.data) return null;
  const { user } = me.data;
  const logout = async () => {
    setPending(true);
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      queryClient.clear();
      router.replace('/login');
    }
  };
  return (
    <div className="mt-2 flex items-center gap-2.5 border-t border-sidebar-border px-1.5 pt-3">
      <Initial name={user.login} round />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{user.login}</span>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={logout}
        disabled={pending}
        aria-label="Se déconnecter"
        title="Se déconnecter"
      >
        <LogOutIcon />
      </Button>
    </div>
  );
}

function Initial({ name, round = false }: { name: string; round?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-7 shrink-0 place-items-center bg-accent text-xs font-semibold text-accent-foreground uppercase',
        round ? 'rounded-full' : 'rounded-md',
      )}
    >
      {name.slice(0, 1)}
    </span>
  );
}

/** Barre latérale fixe, à partir des écrans larges. */
export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-svh w-60 shrink-0 overflow-y-auto border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:block">
      <SidebarContent />
    </aside>
  );
}

/** Barre du haut et menu en tiroir, sur mobile et tablette. */
export function MobileBar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const home = isDemoPath(pathname) ? '/demo' : '/dashboard';
  return (
    <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-sidebar-border bg-sidebar px-4 py-2.5 lg:hidden">
      <Link
        href={home}
        className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Logo />
      </Link>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger
          className={buttonVariants({ variant: 'ghost', size: 'icon' })}
          aria-label="Ouvrir le menu"
        >
          <MenuIcon />
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
          <Dialog.Popup className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] overflow-y-auto bg-sidebar text-sidebar-foreground shadow-xl outline-none transition-transform duration-200 data-[ending-style]:-translate-x-full data-[starting-style]:-translate-x-full">
            <Dialog.Title className="sr-only">Menu</Dialog.Title>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
