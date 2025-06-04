
"use client";

import Link from 'next/link';
import { AppHeader } from '@/components/layout/header';
import { AppFooter } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Loader2, AlertTriangle, BarChart3 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { db, firebaseInitializationError } from '@/lib/firebase';
import { collection, onSnapshot, QueryDocumentSnapshot, DocumentData, Timestamp } from "firebase/firestore";
import { useEffect, useState, useMemo } from 'react';
import { format, startOfMonth, parseISO } from 'date-fns';

interface Event {
  id: string;
  date: Date;
  type?: 'event1' | 'event2' | 'event3' | string;
}

interface MonthlyStat {
  month: string; // e.g., "January 2024"
  rawngbawlna: number;
  hlaZir: number;
  others: number;
  // defaultEvent: number; // No longer explicitly needed for chart if not displayed
}

const chartConfig = {
  rawngbawlna: {
    label: "Rawngbawlna",
    color: "hsl(var(--chart-5))", // Red-ish
  },
  hlaZir: {
    label: "Hla Zir",
    color: "hsl(var(--chart-1))", // Blue
  },
  others: {
    label: "Others",
    color: "hsl(var(--chart-3))", // Green
  },
  // defaultEvent entry removed
} satisfies ChartConfig;

export default function EventStatsPage() {
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (firebaseInitializationError) {
      setError(`Firebase Initialization Error: ${firebaseInitializationError}`);
      setIsLoading(false);
      return;
    }
    if (!db) {
      setError("Firestore database is not available.");
      setIsLoading(false);
      return;
    }

    const eventsCollectionRef = collection(db, "calendarEvents");
    const unsubscribe = onSnapshot(eventsCollectionRef, (snapshot) => {
      const fetchedEvents: Event[] = snapshot.docs.map((docSnap: QueryDocumentSnapshot<DocumentData>) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          date: data.date instanceof Timestamp ? data.date.toDate() : new Date(),
          type: data.type,
        };
      });

      const statsByMonth: Record<string, Omit<MonthlyStat, 'month'>> = {};

      fetchedEvents.forEach(event => {
        const monthKey = format(startOfMonth(event.date), "yyyy-MM"); // "2024-01" for sorting
        
        if (!statsByMonth[monthKey]) {
          statsByMonth[monthKey] = { rawngbawlna: 0, hlaZir: 0, others: 0, defaultEvent: 0 };
        }

        switch (event.type) {
          case 'event1':
            statsByMonth[monthKey].rawngbawlna++;
            break;
          case 'event2':
            statsByMonth[monthKey].hlaZir++;
            break;
          case 'event3':
            statsByMonth[monthKey].others++;
            break;
          default:
            (statsByMonth[monthKey] as any).defaultEvent++; // Keep counting for data integrity if needed elsewhere
            break;
        }
      });
      
      const formattedStats: MonthlyStat[] = Object.entries(statsByMonth)
        .map(([monthKey, counts]) => ({
          month: format(parseISO(monthKey + "-01"), "MMMM yyyy"), // "January 2024" for display
          rawngbawlna: counts.rawngbawlna,
          hlaZir: counts.hlaZir,
          others: counts.others,
          // defaultEvent: (counts as any).defaultEvent, // No longer explicitly needed for chart
        }))
        .sort((a, b) => {
            // Ensure statsByMonth keys used for sorting are correctly mapped back if needed
            const findMonthKey = (stats: Record<string, any>, formattedMonth: string) => 
                Object.keys(stats).find(key => format(parseISO(key + "-01"), "MMMM yyyy") === formattedMonth);
            
            const keyA = findMonthKey(statsByMonth, a.month);
            const keyB = findMonthKey(statsByMonth, b.month);

            if (!keyA || !keyB) return 0; // Should not happen if data is consistent

            const dateA = parseISO(keyA + "-01");
            const dateB = parseISO(keyB + "-01");
            return dateA.getTime() - dateB.getTime();
        });

      setMonthlyStats(formattedStats);
      setIsLoading(false);
      setError(null);
    }, (err) => {
      console.error("Error fetching event stats:", err);
      setError(`Failed to load event statistics: ${err.message}`);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <AppHeader />
      <main className="flex-1 flex-col items-center justify-start gap-6 p-4 md:gap-8 md:p-6 lg:p-8 bg-muted/20">
        <div className="w-full max-w-5xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-primary" />
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Monthly Event Statistics</h1>
            </div>
            <Button variant="outline" asChild className="w-full sm:w-auto">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </div>

          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle>Event Counts by Type (Monthly)</CardTitle>
              <CardDescription>
                This chart displays the number of Rawngbawlna, Hla Zir, and Others events recorded each month.
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-[300px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
                  <span className="text-muted-foreground">Loading chart data...</span>
                </div>
              ) : error ? (
                <div className="text-destructive p-4 bg-destructive/10 border border-destructive rounded-md h-full flex flex-col items-center justify-center">
                  <AlertTriangle className="mr-2 h-6 w-6" />
                  <span className="font-semibold">Error Loading Chart</span>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              ) : monthlyStats.length === 0 ? (
                 <div className="flex items-center justify-center h-full text-muted-foreground">
                  No event data available to display statistics.
                </div>
              ) : (
                <ChartContainer config={chartConfig} className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyStats} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis 
                        dataKey="month" 
                        tickLine={false} 
                        axisLine={false} 
                        tickMargin={8}
                        angle={-30} // Angle ticks for better readability if many months
                        textAnchor="end"
                        height={60} // Increase height to accommodate angled ticks
                        interval={0} // Show all month ticks
                      />
                      <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
                      <Tooltip content={<ChartTooltipContent />} cursor={true} />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Bar dataKey="rawngbawlna" fill="var(--color-rawngbawlna)" radius={[4, 4, 0, 0]} name="Rawngbawlna" />
                      <Bar dataKey="hlaZir" fill="var(--color-hlaZir)" radius={[4, 4, 0, 0]} name="Hla Zir" />
                      <Bar dataKey="others" fill="var(--color-others)" radius={[4, 4, 0, 0]} name="Others" />
                      {/* <Bar dataKey="defaultEvent" fill="var(--color-defaultEvent)" radius={[4, 4, 0, 0]} name="Default" /> */}
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}

