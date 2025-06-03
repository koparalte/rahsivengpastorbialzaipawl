
"use client"; // Added "use client"

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Shield, LogIn, LogOut, UserCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export function AppHeader() {
  const { user, isAdmin, loading: authLoading, loginWithGoogle, logout, authError } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
      <div className="container flex h-16 items-center justify-start px-4 md:px-6"> {/* Changed justify-end to justify-start */}
        <div className="flex items-center gap-2">
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
              <span className="flex items-center text-xs sm:text-sm text-muted-foreground">
                <UserCircle className="mr-1.5 h-4 w-4" />
                {user.displayName || user.email}{isAdmin ? ' (Admin)' : ''}
              </span>
              <Button variant="outline" size="sm" onClick={logout} className="shadow-sm hover:shadow-md transition-shadow">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={loginWithGoogle}
              className="shadow-sm hover:shadow-md transition-shadow bg-[#129990] hover:bg-[#0F7A73] text-primary-foreground"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Login with Google
            </Button>
          )}
          {user && isAdmin && (
            <Link href="/admin/dashboard">
              <Button variant="outline" size="sm" className="shadow-sm hover:shadow-md transition-shadow">
                <Shield className="mr-2 h-4 w-4" />
                Admin Panel
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
