
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface EventCardProps {
  title: string;
  description: string;
  imageUrl?: string;
  displayDate?: string; // Formatted date string (e.g., "25 Mar" or "25 Mar - 27 Mar")
  session?: 'Zing' | 'Chawhnu' | 'Zan';
  eventType?: 'event1' | 'event2' | 'event3' | string;
}

export function EventCard({ title, description, imageUrl, displayDate, session, eventType }: EventCardProps) {
  const hasImage = !!imageUrl;

  return (
    <Card
      className={cn(
        "hover:shadow-md transition-shadow relative overflow-hidden w-full flex flex-col" // Removed h-full
      )}
    >
      {hasImage && (
        <>
          <Image
            src={imageUrl}
            alt={`Background for ${title}`}
            layout="fill"
            objectFit="cover"
            className="absolute inset-0 z-0"
            data-ai-hint="event abstract"
          />
          {(displayDate || (eventType === 'event1' && session)) && (
            <div className="absolute top-2 left-2 z-30 bg-black/70 text-white text-xs font-semibold px-2 py-1 rounded flex items-center gap-1">
              {displayDate && <span>{displayDate}</span>}
              {eventType === 'event1' && session && (
                <>
                  {displayDate && <span className="border-l border-white/50 pl-1 ml-1"></span>}
                  <span>{session}</span>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Content wrapper for icon, title, and description */}
      <div className={cn(
        "relative mt-auto flex flex-row flex-grow z-10",
        hasImage ? "bg-black/70 text-primary-foreground" : "bg-card text-card-foreground"
      )}>
        {/* Black left part / accent bar */}
        <div className="w-1.5 bg-black flex-shrink-0" />

        {/* Inner content wrapper with padding */}
        <div className={cn(
          "flex-grow flex flex-col",
          (hasImage && (displayDate || (eventType === 'event1' && session))) ? "pt-10 px-4 pb-4" : "p-4" // More top padding if date/session overlay is present
        )}>
          <CardHeader className="p-0 pb-2">
            <div className="flex items-center gap-2">
              <CalendarDays className={cn("h-5 w-5", hasImage ? "text-primary-foreground/80" : "text-muted-foreground")} />
              <CardTitle className={cn("text-lg", hasImage ? "text-primary-foreground" : "text-card-foreground")}>{title}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex-grow">
            <CardDescription className={cn("text-sm", hasImage ? "text-primary-foreground/90" : "text-muted-foreground")}>
              {description}
            </CardDescription>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}
