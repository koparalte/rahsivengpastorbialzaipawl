
"use client";

import Link from 'next/link';
import { AppHeader } from '@/components/layout/header';
import { AppFooter } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Loader2, AlertTriangle, BarChart3, ListChecks, CalendarCheck, CalendarClock, Package, CalendarDays, Users } from 'lucide-react'; 
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { db, firebaseInitializationError } from '@/lib/firebase';
import { collection, onSnapshot, QueryDocumentSnapshot, DocumentData, Timestamp } from "firebase/firestore";
import { useEffect, useState, useMemo } from 'react';
import { format, startOfMonth, parseISO, isSameDay, startOfDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"; 
import { getCachedData, setCachedData } from '@/lib/cache';

const STATS_EVENTS_CACHE_KEY = 'firebaseStatsEventsCache';

interface ChartEvent {
  id: string;
  date: Date;
  type?: 'event1' | 'event2' | 'event3' | string;
}

interface DetailedEvent {
  id: string;
  title: string;
  description: string;
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

const isEventPastOrCurrent = (event: DetailedEvent): boolean => {
  const today = startOfDay(new Date());
  const eventEffectiveEndDate = event.endDate instanceof Date && !isNaN(event.endDate.getTime())
    ? startOfDay(event.endDate)
    : startOfDay(event.date);
  return eventEffectiveEndDate <= today;
};

const getEventTypeLabel = (type?: DetailedEvent['type']): string => {
  switch (type) {
    case 'event1':
      return "Rawngbawlna";
    case 'event2':
      return "Hla Zir";
    case 'event3':
      return "Others";
    default:
      return "Event";
  }
};

export default function EventStatsPage() {
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStat[]>([]);
  const [allDetailedEvents, setAllDetailedEvents] = useState<DetailedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEventForDialog, setSelectedEventForDialog] = useState<DetailedEvent | null>(null);
  const [isEventDetailDialogOpen, setIsEventDetailDialogOpen] = useState(false);

  useEffect(() => {
    const cachedEvents = getCachedData<DetailedEvent[]>(STATS_EVENTS_CACHE_KEY);
    if (cachedEvents) {
      processEventsData(cachedEvents);
      setIsLoading(false);
      console.log("[StatsPage] Loaded events from cache.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processEventsData = (fetchedDetailedEvents: DetailedEvent[]) => {
      setAllDetailedEvents(fetchedDetailedEvents);

      const statsByMonth: Record<string, Omit<MonthlyStat, 'month'>> = {};
      fetchedDetailedEvents.forEach(event => { // Use fetchedDetailedEvents for stats calculation
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
          month: format(parseISO(monthKey + "-01"), "MMM yy"),
          rawngbawlna: counts.rawngbawlna,
          hlaZir: counts.hlaZir,
          others: counts.others,
        }))
        .sort((a, b) => {
            const dateAKeys = Object.keys(statsByMonth).filter(key => format(parseISO(key + "-01"), "MMM yy") === a.month);
            const dateBKeys = Object.keys(statsByMonth).filter(key => format(parseISO(key + "-01"), "MMM yy") === b.month);
            if (dateAKeys.length === 0 || dateBKeys.length === 0) return 0; // Should not happen if data is consistent

            const dateA = parseISO(dateAKeys[0] + "-01");
            const dateB = parseISO(dateBKeys[0] + "-01");
            return dateA.getTime() - dateB.getTime();
        });
      setMonthlyStats(formattedStats);
  };

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
      const fetchedDetailedEvents: DetailedEvent[] = [];

      snapshot.docs.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
        const data = docSnap.data();
        const eventDate = data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date);
        const eventEndDate = data.endDate instanceof Timestamp ? data.endDate.toDate() : (data.endDate ? new Date(data.endDate) : undefined);

        fetchedDetailedEvents.push({
            id: docSnap.id,
            title: data.title || "Untitled Event",
            description: data.description || "No description available.",
            date: eventDate,
            endDate: eventEndDate,
            type: data.type,
            session: data.session,
        });
      });

      processEventsData(fetchedDetailedEvents);
      setCachedData(STATS_EVENTS_CACHE_KEY, fetchedDetailedEvents); // Update cache
      setIsLoading(false);
      setError(null);
    }, (err) => {
      console.error("Error fetching event stats:", err);
      if (!getCachedData(STATS_EVENTS_CACHE_KEY)) { // Only set error if no cache
         setError(`Failed to load event statistics: ${err.message}`);
      }
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
        const dateDiff = b.date.getTime() - a.date.getTime(); 
        if (dateDiff !== 0) return dateDiff;

        if (a.type === 'event1' && b.type === 'event1' && a.session && b.session) {
          const sessionA = sessionOrder[a.session] ?? Infinity;
          const sessionB = sessionOrder[b.session] ?? Infinity;
          if (sessionA !== sessionB) return sessionA - sessionB;
        }
        return (a.title || "").localeCompare(b.title || "");
      });
    }
    return groups;
  }, [pastOrCurrentDetailedEvents]);

  const sortedMonthKeys = useMemo(() => Object.keys(groupedEventsByMonth).sort((a,b) => new Date(b).getTime() - new Date(a).getTime()), [groupedEventsByMonth]);

  const handleEventCardClick = (event: DetailedEvent) => {
    setSelectedEventForDialog(event);
    setIsEventDetailDialogOpen(true);
  };

  const renderDialogDate = (event: DetailedEvent): string => {
    if (!event.date) return "N/A";
    let dateStr = format(event.date, "PPP");
    if (event.endDate && !isSameDay(event.date, event.endDate)) {
      dateStr += ` - ${format(event.endDate, "PPP")}`;
    }
    return dateStr;
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <AppHeader />
      <main className="flex-1 flex-col items-center justify-start gap-6 p-4 md:gap-8 md:p-6 lg:p-8 bg-muted/20">
        <div className="w-full max-w-5xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-primary" />
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Activity Statistics</h1>
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
                <CardTitle className="font-bold text-center flex-1">Tun Term chhung a Activities neih tawh te</CardTitle>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t">
                <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-md">
                  <CalendarCheck className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total Rawngbawlna</p>
                    <p className="text-lg font-semibold">{isLoading && totalCounts.event1 === 0 ? <Loader2 className="h-4 w-4 animate-spin" /> : totalCounts.event1}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-md">
                  <CalendarClock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total Hla Zir</p>
                    <p className="text-lg font-semibold">{isLoading && totalCounts.event2 === 0 ? <Loader2 className="h-4 w-4 animate-spin" /> : totalCounts.event2}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-md">
                  <Package className="h-5 w-5 text-accent" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total Others</p>
                    <p className="text-lg font-semibold">{isLoading && totalCounts.event3 === 0 ? <Loader2 className="h-4 w-4 animate-spin" /> : totalCounts.event3}</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="min-h-[200px]">
              {isLoading && sortedMonthKeys.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
                  <span className="text-muted-foreground">Loading event list...</span>
                </div>
              ) : error && !getCachedData(STATS_EVENTS_CACHE_KEY) ? (
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
                            let dateDisplay = format(event.date, "PP");
                            if (event.endDate && !isSameDay(event.date, event.endDate)) {
                              dateDisplay += ` - ${format(event.endDate, "PP")}`;
                            }
                            return (
                              <li
                                key={event.id}
                                className="flex flex-col p-3 border rounded-md bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                                onClick={() => handleEventCardClick(event)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleEventCardClick(event);}}
                                aria-label={`View details for ${event.title}`}
                              >
                                <div className="flex-grow mb-1">
                                  <p className="font-medium text-card-foreground">{event.title}</p>
                                  <p className="text-xs text-muted-foreground">{dateDisplay}</p>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{event.description}</p>
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
              {isLoading && monthlyStats.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
                  <span className="text-muted-foreground">Loading chart data...</span>
                </div>
              ) : error && !getCachedData(STATS_EVENTS_CACHE_KEY) ? (
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
                <div className="overflow-x-auto">
                  <ChartContainer config={chartConfig} className="h-[450px] w-full min-w-[600px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={monthlyStats}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        barCategoryGap="20%"
                      >
                        <CartesianGrid vertical={true} horizontal={true} strokeDasharray="3 3" />
                        <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
                        <YAxis
                          dataKey="month"
                          type="category"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          width={80}
                          interval={0}
                        />
                        <Tooltip content={<ChartTooltipContent />} cursor={{ fill: 'hsl(var(--muted))' }} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar dataKey="rawngbawlna" fill="var(--color-rawngbawlna)" radius={[0, 4, 4, 0]} name="Rawngbawlna" />
                        <Bar dataKey="hlaZir" fill="var(--color-hlaZir)" radius={[0, 4, 4, 0]} name="Hla Zir" />
                        <Bar dataKey="others" fill="var(--color-others)" radius={[0, 4, 4, 0]} name="Others" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <AppFooter />

      {selectedEventForDialog && (
        <Dialog open={isEventDetailDialogOpen} onOpenChange={setIsEventDetailDialogOpen}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedEventForDialog.type === 'event1' && <CalendarCheck className="h-5 w-5 text-destructive" />}
                {selectedEventForDialog.type === 'event2' && <CalendarClock className="h-5 w-5 text-primary" />}
                {selectedEventForDialog.type === 'event3' && <Package className="h-5 w-5 text-accent" />}
                {!['event1', 'event2', 'event3'].includes(selectedEventForDialog.type || '') && <CalendarDays className="h-5 w-5 text-muted-foreground" />}
                {selectedEventForDialog.title}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-4 text-sm">
              <div className="grid grid-cols-[auto_1fr] items-start gap-x-3">
                <strong className="text-muted-foreground whitespace-nowrap">Date:</strong>
                <span>{renderDialogDate(selectedEventForDialog)}</span>
              </div>

              {selectedEventForDialog.type && (
                <div className="grid grid-cols-[auto_1fr] items-start gap-x-3">
                  <strong className="text-muted-foreground">Type:</strong>
                  <span>{getEventTypeLabel(selectedEventForDialog.type)}</span>
                </div>
              )}

              {selectedEventForDialog.type === 'event1' && selectedEventForDialog.session && (
                <div className="grid grid-cols-[auto_1fr] items-start gap-x-3">
                  <strong className="text-muted-foreground">Session:</strong>
                  <span>{selectedEventForDialog.session}</span>
                </div>
              )}

              <div className="col-span-2 pt-2">
                <strong className="text-muted-foreground">Description:</strong>
                <p className="mt-1 text-foreground whitespace-pre-wrap">{selectedEventForDialog.description}</p>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Close
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
