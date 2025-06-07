
"use client";

import Link from 'next/link';
import { AppHeader } from '@/components/layout/header';
import { AppFooter } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Loader2, AlertTriangle, BarChart3, ListChecks, CalendarCheck, CalendarClock, Package } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { db, firebaseInitializationError } from '@/lib/firebase';
import { collection, onSnapshot, QueryDocumentSnapshot, DocumentData, Timestamp } from "firebase/firestore";
import { useEffect, useState, useMemo } from 'react';
import { format, startOfMonth, parseISO, isSameDay, startOfDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ChartEvent {
  id: string;
  date: Date;
  type?: 'event1' | 'event2' | 'event3' | string;
}

interface DetailedEvent {
  id: string;
  title: string;
  date: Date;
  endDate?: Date;
  type?: 'event1' | 'event2' | 'event3' | string;
  session?: 'Zing' | 'Chawhnu' | 'Zan' | 'Chhun leh Zan';
}

interface MonthlyStat {
  month: string; 
  rawngbawlna: number;
  hlaZir: number;
  others: number;
}

const chartConfig = {
  rawngbawlna: {
    label: "Rawngbawlna",
    color: "hsl(var(--chart-5))", 
  },
  hlaZir: {
    label: "Hla Zir",
    color: "hsl(var(--chart-1))", 
  },
  others: {
    label: "Others",
    color: "hsl(var(--chart-3))", 
  },
} satisfies ChartConfig;

const sessionOrder: Record<string, number> = {
  'Chhun leh Zan': 0,
  'Zing': 1,
  'Chawhnu': 2,
  'Zan': 3,
};

const getEventTypeStyle = (type?: 'event1' | 'event2' | 'event3' | string): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } => {
  switch (type) {
    case 'event1':
      return { label: "Rawngbawlna", variant: "destructive" };
    case 'event2':
      return { label: "Hla Zir", variant: "default" };
    case 'event3':
      return { label: "Others", variant: "secondary" };
    default:
      return { label: "Event", variant: "outline" };
  }
};

const isEventPastOrCurrent = (event: DetailedEvent): boolean => {
  const today = startOfDay(new Date());
  // Use endDate if it exists and is valid, otherwise use the start date.
  const eventEffectiveEndDate = event.endDate instanceof Date && !isNaN(event.endDate.getTime()) 
    ? startOfDay(event.endDate) 
    : startOfDay(event.date);
  return eventEffectiveEndDate <= today;
};

export default function EventStatsPage() {
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStat[]>([]);
  const [allDetailedEvents, setAllDetailedEvents] = useState<DetailedEvent[]>([]);
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
      const fetchedChartEvents: ChartEvent[] = [];
      const fetchedDetailedEvents: DetailedEvent[] = [];

      snapshot.docs.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
        const data = docSnap.data();
        const eventDate = data.date instanceof Timestamp ? data.date.toDate() : new Date();
        const eventEndDate = data.endDate instanceof Timestamp ? data.endDate.toDate() : undefined;
        
        // For the chart, include all events
        fetchedChartEvents.push({
          id: docSnap.id,
          date: eventDate,
          type: data.type,
        });
        
        // For the detailed list, also include all initially
        fetchedDetailedEvents.push({
            id: docSnap.id,
            title: data.title || "Untitled Event",
            date: eventDate,
            endDate: eventEndDate,
            type: data.type,
            session: data.session,
        });
      });

      setAllDetailedEvents(fetchedDetailedEvents); // Store all events for potential other uses

      // --- Monthly Chart Stats (uses all events) ---
      const statsByMonth: Record<string, Omit<MonthlyStat, 'month'>> = {};
      fetchedChartEvents.forEach(event => {
        const monthKey = format(startOfMonth(event.date), "yyyy-MM");
        if (!statsByMonth[monthKey]) {
          statsByMonth[monthKey] = { rawngbawlna: 0, hlaZir: 0, others: 0 };
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
        }
      });
      
      const formattedStats: MonthlyStat[] = Object.entries(statsByMonth)
        .map(([monthKey, counts]) => ({
          month: format(parseISO(monthKey + "-01"), "MMMM yyyy"),
          rawngbawlna: counts.rawngbawlna,
          hlaZir: counts.hlaZir,
          others: counts.others,
        }))
        .sort((a, b) => {
            const findMonthKey = (stats: Record<string, any>, formattedMonth: string) => 
                Object.keys(stats).find(key => format(parseISO(key + "-01"), "MMMM yyyy") === formattedMonth);
            const keyA = findMonthKey(statsByMonth, a.month);
            const keyB = findMonthKey(statsByMonth, b.month);
            if (!keyA || !keyB) return 0;
            const dateA = parseISO(keyA + "-01");
            const dateB = parseISO(keyB + "-01");
            return dateA.getTime() - dateB.getTime();
        });
      setMonthlyStats(formattedStats);
      // --- End Monthly Chart Stats ---

      setIsLoading(false);
      setError(null);
    }, (err) => {
      console.error("Error fetching event stats:", err);
      setError(`Failed to load event statistics: ${err.message}`);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const pastOrCurrentDetailedEvents = useMemo(() => {
    return allDetailedEvents.filter(isEventPastOrCurrent);
  }, [allDetailedEvents]);

  const totalCounts = useMemo(() => {
    let event1 = 0;
    let event2 = 0;
    let event3 = 0;
    pastOrCurrentDetailedEvents.forEach(event => {
      if (event.type === 'event1') event1++;
      else if (event.type === 'event2') event2++;
      else if (event.type === 'event3') event3++;
    });
    return { event1, event2, event3 };
  }, [pastOrCurrentDetailedEvents]);

  const groupedEventsByMonth = useMemo(() => {
    const groups: Record<string, DetailedEvent[]> = {};
    pastOrCurrentDetailedEvents.forEach(event => {
      const monthKey = format(startOfMonth(event.date), "yyyy-MM");
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(event);
    });

    for (const monthKey in groups) {
      groups[monthKey].sort((a, b) => {
        const dateDiff = a.date.getTime() - b.date.getTime();
        if (dateDiff !== 0) return dateDiff;

        if (a.type === 'event1' && b.type === 'event1') {
          const sessionA = a.session ? sessionOrder[a.session] : Infinity;
          const sessionB = b.session ? sessionOrder[b.session] : Infinity;
          if (sessionA !== sessionB) return sessionA - sessionB;
        }
        return (a.title || "").localeCompare(b.title || "");
      });
    }
    return groups;
  }, [pastOrCurrentDetailedEvents]);

  const sortedMonthKeys = useMemo(() => Object.keys(groupedEventsByMonth).sort((a,b) => new Date(b).getTime() - new Date(a).getTime()), [groupedEventsByMonth]); // Sort recent months first

  return (
    <div className="flex min-h-screen w-full flex-col">
      <AppHeader />
      <main className="flex-1 flex-col items-center justify-start gap-6 p-4 md:gap-8 md:p-6 lg:p-8 bg-muted/20">
        <div className="w-full max-w-5xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-primary" />
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Monthly Activity Statistics</h1>
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
              <div className="flex items-center gap-2 mb-2">
                <ListChecks className="h-6 w-6 text-primary" />
                <CardTitle>All Activities Count (Past &amp; Current Only)</CardTitle>
              </div>
              <CardDescription>
                A complete list of all past and current activities, grouped by month, along with overall totals for key event types.
              </CardDescription>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t">
                <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-md">
                  <CalendarCheck className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total Rawngbawlna</p>
                    <p className="text-lg font-semibold">{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : totalCounts.event1}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-md">
                  <CalendarClock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total Hla Zir</p>
                    <p className="text-lg font-semibold">{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : totalCounts.event2}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-md">
                  <Package className="h-5 w-5 text-accent" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total Others</p>
                    <p className="text-lg font-semibold">{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : totalCounts.event3}</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="min-h-[200px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
                  <span className="text-muted-foreground">Loading event list...</span>
                </div>
              ) : error ? (
                <div className="text-destructive p-4 bg-destructive/10 border border-destructive rounded-md h-full flex flex-col items-center justify-center">
                  <AlertTriangle className="mr-2 h-6 w-6" />
                  <span className="font-semibold">Error Loading Event List</span>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              ) : sortedMonthKeys.length === 0 ? (
                 <div className="flex items-center justify-center h-full text-muted-foreground">
                  No past or current detailed event data available to display.
                </div>
              ) : (
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-6">
                    {sortedMonthKeys.map(monthKey => (
                      <div key={monthKey}>
                        <h3 className="text-xl font-semibold mb-3 text-primary border-b pb-1">
                          {format(parseISO(monthKey + "-01"), "MMMM yyyy")}
                        </h3>
                        <ul className="space-y-2">
                          {groupedEventsByMonth[monthKey].map(event => {
                            const { label: eventTypeLabel, variant: eventTypeVariant } = getEventTypeStyle(event.type);
                            let dateDisplay = format(event.date, "PP");
                            if (event.endDate && !isSameDay(event.date, event.endDate)) {
                              dateDisplay += ` - ${format(event.endDate, "PP")}`;
                            }
                            if (event.type === 'event1' && event.session) {
                              dateDisplay += ` (${event.session})`;
                            }
                            return (
                              <li key={event.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-md bg-card hover:bg-muted/50 transition-colors">
                                <div className="flex-grow mb-2 sm:mb-0">
                                  <p className="font-medium text-card-foreground">{event.title}</p>
                                  <p className="text-xs text-muted-foreground">{dateDisplay}</p>
                                </div>
                                <Badge variant={eventTypeVariant} className="whitespace-nowrap self-start sm:self-center">{eventTypeLabel}</Badge>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-xl">
            <CardContent className="min-h-[300px] pt-6">
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
                  No activity data available to display statistics for chart.
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
                        angle={-30}
                        textAnchor="end"
                        height={60} 
                        interval={0}
                      />
                      <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
                      <Tooltip content={<ChartTooltipContent />} cursor={true} />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Bar dataKey="rawngbawlna" fill="var(--color-rawngbawlna)" radius={[4, 4, 0, 0]} name="Rawngbawlna" />
                      <Bar dataKey="hlaZir" fill="var(--color-hlaZir)" radius={[4, 4, 0, 0]} name="Hla Zir" />
                      <Bar dataKey="others" fill="var(--color-others)" radius={[4, 4, 0, 0]} name="Others" />
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
