
"use client";

import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { UserCircle, Users, Phone, ExternalLink, Church } from 'lucide-react'; // Added Church icon
import { Button } from '@/components/ui/button';

interface PictureFrameProps {
  imageUrl: string;
  altText: string;
  aiHint?: string;
  name?: string;
  designation?: string;
  designation2?: string;
  phoneNumber?: string;
  profileUrl?: string;
  kohhran?: string; // New prop for Kohhran
}

export function PictureFrame({
  imageUrl,
  altText,
  aiHint = "image",
  name = "N/A",
  designation = "N/A",
  designation2,
  phoneNumber = "N/A",
  profileUrl,
  kohhran // New prop
}: PictureFrameProps) {
  return (
    <Card className="w-full max-w-[9rem] shadow-xl overflow-hidden flex flex-col">
      <CardContent className="p-2 pb-0">
        <div className="aspect-square relative border-4 border-muted rounded-sm shadow-inner">
          <Image
            src={imageUrl}
            alt={altText}
            layout="fill"
            objectFit="cover"
            className="rounded-sm"
            data-ai-hint={aiHint}
          />
          {designation2 && designation2 !== "N/A" && (
            <div className="absolute bottom-1 left-1 bg-black/70 text-white text-[0.65rem] leading-tight px-1.5 py-1 rounded-sm z-10 max-w-[calc(100%-0.5rem)] truncate">
              {designation2}
            </div>
          )}
        </div>
      </CardContent>
      <CardContent className="p-2 pt-1 flex flex-col flex-grow">
        <div className="flex flex-col text-xs flex-grow space-y-0.5">
          {name && name !== "N/A" && (
            <div className="flex items-center gap-1 overflow-hidden">
              <UserCircle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <p className="font-semibold text-accent-foreground truncate min-w-0 flex-1">{name}</p>
            </div>
          )}
          {designation && designation !== "N/A" && (
            <div className="flex items-center gap-1 overflow-hidden">
              <Users className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <p className="text-accent-foreground truncate min-w-0 flex-1">{designation}</p>
            </div>
          )}
          {phoneNumber && phoneNumber !== "N/A" && (
            <div className="flex items-center gap-1 overflow-hidden">
              <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <a
                href={`tel:${phoneNumber.replace(/\D/g, '')}`}
                className="text-accent-foreground hover:text-primary transition-colors truncate min-w-0 flex-1"
              >
                {phoneNumber}
              </a>
            </div>
          )}
          {kohhran && kohhran !== "N/A" && (
            <div className="flex items-center gap-1 overflow-hidden">
              <Church className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <p className="text-accent-foreground truncate min-w-0 flex-1">{kohhran}</p>
            </div>
          )}
        </div>
        {profileUrl && profileUrl !== "N/A" && (
          <div className="mt-auto pt-1 border-t border-border">
            <Button asChild variant="outline" size="sm" className="w-full h-7 text-xs">
              <a href={profileUrl} target="_blank" rel="noopener noreferrer">
                Profile
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
