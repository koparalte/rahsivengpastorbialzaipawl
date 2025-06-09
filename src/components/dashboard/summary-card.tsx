
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from '@/lib/utils';

interface SummaryCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  description?: string;
}

export function SummaryCard({ title, value, icon: Icon, description }: SummaryCardProps) {
  return (
    <Card className={cn(
      "shadow-lg hover:shadow-xl transition-shadow duration-300 hover:bg-muted/50", // Added hover:bg-muted/50
      "h-full flex flex-col"
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-accent" />
      </CardHeader>
      <CardContent className={cn(
        "p-3 pt-0",
        "flex-grow flex flex-col justify-center"
      )}>
        <div className="text-xl font-bold text-card-foreground text-center">{value}</div>
        {description && <p className="text-xs text-muted-foreground pt-1 text-center">{description}</p>}
      </CardContent>
    </Card>
  );
}
