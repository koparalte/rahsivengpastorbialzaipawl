
"use client";

import { useState, useEffect } from 'react';
// Removed Link, Button, Shield, LogIn, LogOut, UserCircle, Loader2 imports
// Removed useAuth import

export function AppFooter() {
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  // Removed useAuth() call and related state

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="flex flex-col items-center justify-between py-4 px-6 text-sm text-muted-foreground border-t gap-4 sm:flex-row">
      <span className="text-center sm:text-left">
        © {currentYear !== null ? currentYear : '...'} Rahsiveng Pastor Bial Zaipawl. All rights reserved.
      </span>
      {/* Removed the div containing auth buttons and error messages */}
    </footer>
  );
}
