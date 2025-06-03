
import type { Metadata } from 'next';
import { AppHeader } from '@/components/layout/header';
import { AppFooter } from '@/components/layout/footer';

export const metadata: Metadata = {
  title: 'Admin Dashboard - Rahsiveng Pastor Bial Zaipawl',
  description: 'Manage events and site settings for Rahsiveng Pastor Bial Zaipawl.',
};

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1 bg-muted/20">
        {children}
      </main>
      <AppFooter />
    </div>
  );
}
