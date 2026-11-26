import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { THEME_SCRIPT } from '@/lib/theme-script';
import { Providers } from './providers';
import './globals.css';

// Polices du thème Azure Flow (docs/04-FRONTEND.md).
const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'XCadence',
  description: 'Radar de santé d’équipe tech',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // La classe `dark` est posée avant l'affichage par THEME_SCRIPT : l'écart avec le rendu
    // serveur est attendu.
    <html
      lang="fr"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
