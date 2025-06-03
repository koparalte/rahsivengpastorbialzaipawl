
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Shield, LogIn, LogOut, UserCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export function AppFooter() {
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const { user, loading: authLoading, loginWithGoogle, logout, authError } = useAuth();

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="flex flex-col items-center justify-between py-4 px-6 text-sm text-muted-foreground border-t gap-4 sm:flex-row">
      <span className="text-center sm:text-left">
        © {currentYear !== null ? currentYear : '...'} Rahsiveng Pastor Bial Zaipawl. All rights reserved.
      </span>
      <div className="flex flex-col sm:flex-row items-center gap-2">
        {authError && !user && (
          <span className="text-xs text-destructive mr-2 text-center sm:text-right">
            Auth Error: {authError.length > 50 ? authError.substring(0, 50) + "..." : authError}
          </span>
        )}
        {authLoading ? (
          <Button variant="outline" size="sm" disabled className="shadow-sm">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </Button>
        ) : user ? (
          <>
            <span className="flex items-center text-xs sm:text-sm">
              <UserCircle className="mr-1.5 h-4 w-4" />
              {user.displayName || user.email}
            </span>
            <Button variant="outline" size="sm" onClick={logout} className="shadow-sm hover:shadow-md transition-shadow">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={loginWithGoogle} className="shadow-sm hover:shadow-md transition-shadow">
            <LogIn className="mr-2 h-4 w-4" />
            Login with Google
          </Button>
        )}
        <Link href="/admin/dashboard">
          <Button variant="outline" size="sm" className="shadow-sm hover:shadow-md transition-shadow">
            <Shield className="mr-2 h-4 w-4" />
            Admin Panel
          </Button>
        </Link>
      </div>
    </footer>
  );
}
