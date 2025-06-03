
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';

export function AppFooter() {
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="flex flex-col sm:flex-row items-center justify-between py-4 px-6 text-sm text-muted-foreground border-t gap-4 sm:gap-0">
      <span className="text-center sm:text-left">
        © {currentYear !== null ? currentYear : '...'} Rahsiveng Pastor Bial Zaipawl. All rights reserved.
      </span>
      <Link href="/admin/dashboard">
        <Button variant="outline" size="sm" className="shadow-sm hover:shadow-md transition-shadow">
          <Shield className="mr-2 h-4 w-4" />
          Admin Panel
        </Button>
      </Link>
    </footer>
  );
}
