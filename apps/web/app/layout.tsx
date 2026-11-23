import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'XCadence',
  description: "Radar de santé d'équipe tech",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-white text-slate-900 antialiased">{children}</body>
    </html>
  );
}
