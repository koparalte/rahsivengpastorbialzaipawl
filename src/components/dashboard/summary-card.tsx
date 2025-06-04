
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SummaryCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  description?: string;
}

export function SummaryCard({ title, value, icon: Icon, description }: SummaryCardProps) {
  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1"> {/* Reduced padding */}
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle> {/* Smaller title */}
        <Icon className="h-4 w-4 text-accent" /> {/* Smaller icon */}
      </CardHeader>
      <CardContent className="p-3 pt-0"> {/* Reduced padding */}
        <div className="text-xl font-bold text-card-foreground">{value}</div> {/* Smaller value */}
        {description && <p className="text-xs text-muted-foreground pt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}
