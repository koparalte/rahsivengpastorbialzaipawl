
import type { Metadata } from 'next';
import { AppHeader } from '@/components/layout/header';
import { AppFooter } from '@/components/layout/footer';

export default function MonthlyActivitiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1 bg-muted/20 py-8">
        {children}
      </main>
      <AppFooter />
    </div>
  );
}
