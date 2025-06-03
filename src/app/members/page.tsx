
"use client";

import { AppHeader } from '@/components/layout/header';
import { AppFooter } from '@/components/layout/footer';
import { MemberGallery } from '@/components/members/member-gallery';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function MembersPage() {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <AppHeader />
      <main className="flex-1 flex-col items-center justify-start gap-6 p-4 md:gap-8 md:p-6 lg:p-8 bg-background">
        <div className="w-full max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-foreground">Our Members</h1>
            <Button variant="outline" asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
          <MemberGallery />
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
