
"use client";

import { useState, useEffect } from 'react';

export function AppFooter() {
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="py-4 px-6 text-center text-sm text-muted-foreground border-t">
      © {currentYear !== null ? currentYear : '...'} Rahsiveng Pastor Bial Zaipawl. All rights reserved.
    </footer>
  );
}
