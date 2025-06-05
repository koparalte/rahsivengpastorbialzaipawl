
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Shield, LogIn, LogOut, UserCircle, Loader2, Menu, Home, Users as UsersIcon, BarChart3 as StatsIcon } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import React, { useState } from 'react';
import { Separator } from '../ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // Import Avatar components

export function AppHeader() {
  const { user, isAdmin, loading: authLoading, loginWithGoogle, logout, authError } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const getInitials = (name?: string | null, email?: string | null): string => {
    if (name) {
      const parts = name.split(' ');
      if (parts.length > 1) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return name[0].toUpperCase();
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U'; // Default User
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        {/* Drawer Navigation for mobile and general access */}
        <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="mr-4">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] sm:w-[320px] p-0">
            <SheetHeader className="p-4 border-b">
              <SheetTitle className="text-lg font-semibold">Navigation</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col p-4 space-y-2">
              <SheetClose asChild>
                <Link href="/" passHref>
                  <Button variant="ghost" className="w-full justify-start text-base">
                    <Home className="mr-3 h-5 w-5" />
                    Home
                  </Button>
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link href="/members" passHref>
                  <Button variant="ghost" className="w-full justify-start text-base">
                    <UsersIcon className="mr-3 h-5 w-5" />
                    Members
                  </Button>
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link href="/stats" passHref>
                  <Button variant="ghost" className="w-full justify-start text-base">
                    <StatsIcon className="mr-3 h-5 w-5" />
                    Activity Statistics
                  </Button>
                </Link>
              </SheetClose>
              
              {user && isAdmin && (
                <SheetClose asChild>
                  <Link href="/admin/dashboard" passHref>
                    <Button variant="ghost" className="w-full justify-start text-base">
                      <Shield className="mr-3 h-5 w-5" />
                      Admin Panel
                    </Button>
                  </Link>
                </SheetClose>
              )}
              {user && (
                <>
                <Separator className="my-2" />
                <SheetClose asChild>
                    <Button 
                        variant="ghost" 
                        className="w-full justify-start text-base text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={async () => {
                            await logout();
                            // setIsDrawerOpen(false); // Drawer closes automatically due to SheetClose
                        }}
                    >
                    <LogOut className="mr-3 h-5 w-5" />
                    Logout
                    </Button>
                </SheetClose>
                </>
              )}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Auth Information / Login Button - pushed to the right */}
        <div className="flex items-center gap-2 ml-auto">
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
            <div className="flex items-center gap-2">
              <Avatar className="h-7 w-7">
                {user.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || user.email || 'User'} />}
                <AvatarFallback className="text-xs">{getInitials(user.displayName, user.email)}</AvatarFallback>
              </Avatar>
              <span className="text-xs sm:text-sm text-muted-foreground">
                {user.displayName || user.email}{isAdmin ? ' (Admin)' : ''}
              </span>
            </div>
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
        </div>
      </div>
    </header>
  );
}
