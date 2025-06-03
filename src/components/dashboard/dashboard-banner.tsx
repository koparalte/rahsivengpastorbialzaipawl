
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from 'next/image';

interface DashboardBannerProps {
  bannerImageUrl?: string;
}

export function DashboardBanner({ bannerImageUrl }: DashboardBannerProps) {
  const defaultImageUrl = "https://placehold.co/1200x400.png";
  const currentImageUrl = bannerImageUrl || defaultImageUrl;

  return (
    <Card className="relative w-full text-primary-foreground shadow-xl my-8 rounded-xl overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src={currentImageUrl}
          alt="KopaGuide Banner Background"
          layout="fill"
          objectFit="cover"
          className="brightness-75"
          data-ai-hint="group photo" 
          priority
        />
      </div>

      {/* Content Section - Centered and Overlaid */}
      <div className="relative z-10 flex flex-col justify-center items-center text-center p-8 md:p-12 min-h-[250px] sm:min-h-[300px] md:min-h-[350px]">
        <CardHeader className="p-0">
          <CardTitle> {/* CardTitle acts as a container; spans control specific text styles */}
            <span className="block text-3xl sm:text-4xl md:text-5xl font-bold uppercase leading-none tracking-tight">
              RAHSIVENG PASTOR BIAL ZAIPAWL
            </span>
            <span className="block text-xl sm:text-2xl md:text-3xl font-normal normal-case mt-2 opacity-90 leading-snug tracking-tight">
              (2024-2026)
            </span>
          </CardTitle>
        </CardHeader>
        {/* CardContent can be removed if no other text is needed */}
      </div>
    </Card>
  );
}

    