
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation'; 
import { Button } from '@/components/ui/button';
import { ArrowLeft, CalendarCheck, CalendarClock, Package as PackageIcon, Loader2, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'; 
import { Card, CardContent } from "@/components/ui/card";
import { EventCard } from '@/components/dashboard/event-card';
import { db, firebaseInitializationError } from '@/lib/firebase';
import { collection, onSnapshot, QueryDocumentSnapshot, DocumentData, Timestamp } from "firebase/firestore";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay, isSameDay, parseISO, addMonths, subMonths } from 'date-fns'; 
import { cn } from '@/lib/utils';
import { getCachedData, setCachedData } from '@/lib/cache';

const MONTHLY_EVENTS_CACHE_PREFIX = 'firebaseMonthlyEventsCache_';

interface Event {
  id: string;
  date: Date;
  endDate?: Date;
  title: string;
  description: string;
  type?: 'event1' | 'event2' | 'event3' | string;
  imageUrl?: string;
  session?: 'Zing' | 'Chawhnu' | 'Zan' | 'Chhun leh Zan';
}

const sessionOrder: Record<NonNullable<Event['session']>, number> = {
  'Chhun leh Zan': 0,
  'Zing': 1,
  'Chawhnu': 2,
  'Zan': 3,
};

const clientIconMapping: { [key: string]: React.ElementType } = {
  event1: CalendarCheck,
  event2: CalendarClock,
  event3: PackageIcon,
  default: PackageIcon,
};

interface MonthlyActivityDisplayProps {
  activityTypeParam: string;
  typeDetail: {
    firestoreType: string;
    displayName: string;
  };
}

export default function MonthlyActivityDisplay({ activityTypeParam, typeDetail }: MonthlyActivityDisplayProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageTitle, setPageTitle] = useState("Monthly Activities");
  const [PageIconComponent, setPageIconComponent] = useState<React.ElementType | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const monthQuery = searchParams.get('month'); 

  const targetMonthDate = useMemo(() => {
    if (monthQuery) {
      try {
        const parsedDate = parseISO(`${monthQuery}-01T00:00:00.000Z`);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate;
        }
        console.warn(`[MonthlyActivityDisplay] Invalid month query parameter: ${monthQuery}. Defaulting to current month.`);
      } catch (e) {
        console.warn(`[MonthlyActivityDisplay] Error parsing month query parameter: ${monthQuery}. Defaulting to current month.`, e);
      }
    }
    return new Date();
  }, [monthQuery]);

  const currentMonthStart = useMemo(() => startOfDay(startOfMonth(targetMonthDate)), [targetMonthDate]);
  const currentMonthEnd = useMemo(() => endOfDay(endOfMonth(targetMonthDate)), [targetMonthDate]);
  const cacheKey = `${MONTHLY_EVENTS_CACHE_PREFIX}${typeDetail.firestoreType}_${format(targetMonthDate, 'yyyy-MM')}`;

  useEffect(() => {
    const monthName = format(targetMonthDate, 'MMMM yyyy');
    const dynamicTitle = `${typeDetail.displayName} for ${monthName}`;
    setPageTitle(dynamicTitle);
    document.title = `${dynamicTitle} | Rahsiveng Pastor Bial Zaipawl`;
    const IconToUse = clientIconMapping[typeDetail.firestoreType] || clientIconMapping.default;
    setPageIconComponent(() => IconToUse);

    // Try loading from cache specific to this month and type
    const cachedEvents = getCachedData<Event[]>(cacheKey);
    if (cachedEvents) {
      setEvents(cachedEvents);
      setIsLoading(false);
      console.log(`[MonthlyActivityDisplay] Loaded events for ${dynamicTitle} from cache.`);
    } else {
      setIsLoading(true); // Ensure loading is true if no cache
    }
  }, [activityTypeParam, typeDetail, targetMonthDate, cacheKey]);

  const handleMonthChange = (newMonthDate: Date) => {
    const newMonthQuery = format(newMonthDate, 'yyyy-MM');
    router.push(`/monthly-activities/${activityTypeParam}?month=${newMonthQuery}`);
  };

  const handlePreviousMonth = () => {
    handleMonthChange(subMonths(targetMonthDate, 1));
  };

  const handleNextMonth = () => {
    handleMonthChange(addMonths(targetMonthDate, 1));
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

    console.log(`[MonthlyActivityDisplay] Page for type: ${typeDetail.displayName}. Selected month for filtering:`,
      format(currentMonthStart, 'yyyy-MM-dd HH:mm:ss'),
      'to',
      format(currentMonthEnd, 'yyyy-MM-dd HH:mm:ss')
    );

    const eventsCollectionRef = collection(db, "calendarEvents");
    const unsubscribe = onSnapshot(eventsCollectionRef, (snapshot) => {
      const fetchedEvents: Event[] = snapshot.docs.map((docSnap: QueryDocumentSnapshot<DocumentData>) => {
        const data = docSnap.data();
        
        console.log(`[Firestore Data Processing] Event ID: ${docSnap.id}, Raw data.date type: ${typeof data.date}, isTimestamp: ${data.date instanceof Timestamp}`, data.date);
        if (data.endDate) {
          console.log(`[Firestore Data Processing] Event ID: ${docSnap.id}, Raw data.endDate type: ${typeof data.endDate}, isTimestamp: ${data.endDate instanceof Timestamp}`, data.endDate);
        }

        const eventDate = data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date);
        if (!(data.date instanceof Timestamp) && typeof data.date !== 'string') {
            console.warn(`[Firestore Data Check - ${docSnap.id}] 'date' field is not a Firestore Timestamp or string. Fallback to current date.`);
        }

        let eventEndDate: Date | undefined = undefined;
        if (data.endDate) {
          if (data.endDate instanceof Timestamp) {
            eventEndDate = data.endDate.toDate();
          } else if (typeof data.endDate === 'string') {
            eventEndDate = new Date(data.endDate);
          } else {
            console.warn(`[Firestore Data Check - ${docSnap.id}] 'endDate' field is present but not a Firestore Timestamp or string. It will be ignored.`);
          }
        }
        
        return {
          id: docSnap.id,
          date: eventDate,
          endDate: eventEndDate instanceof Date && !isNaN(eventEndDate.getTime()) ? eventEndDate : undefined,
          title: data.title || "Untitled Event",
          description: data.description || "No description.",
          type: data.type,
          imageUrl: data.imageUrl,
          session: data.session,
        };
      });
      setEvents(fetchedEvents);
      // This might seem redundant if we are filtering again in useMemo,
      // but we could cache the *entire* fetched set if we had a global cache strategy.
      // For now, we cache the potentially filtered (by date range of snapshot query if we had one) data.
      // Let's cache *all* events and let useMemo filter. The cacheKey for set should be more general.
      // For simplicity of this change, we'll stick to caching based on the current view's specific key for now.
      // A better approach would be a global cache for 'allEvents' and then filter.
      // For now, the useMemo below filters the `fetchedEvents`. We can cache the `filteredEvents` result.
      // This means we don't need to set cache here but after filtering in useMemo.
      // However, `onSnapshot` provides *all* events, so filtering happens client-side.
      // Let's cache `fetchedEvents` with a general key, and then filter.
      // No, stick to current plan: cache what this page uses, which means events for the current month/type
      setCachedData(cacheKey, fetchedEvents.filter(event => { // Pre-filter before caching for this specific key
         const targetFirestoreType = typeDetail.firestoreType;
         const eventStartDate = startOfDay(event.date);
         const effectiveEventEndDate = event.endDate instanceof Date && !isNaN(event.endDate.getTime()) 
                                       ? endOfDay(event.endDate) 
                                       : endOfDay(event.date);
         const eventMatchesType = targetFirestoreType ? event.type === targetFirestoreType : (event.type !== 'event1' && event.type !== 'event2');
         const eventIsInSelectedMonth = eventStartDate <= currentMonthEnd && effectiveEventEndDate >= currentMonthStart;
         return eventMatchesType && eventIsInSelectedMonth;
      }));

      setIsLoading(false);
      setError(null);
    }, (err) => {
      console.error("Error fetching monthly activities:", err);
      if (!getCachedData(cacheKey)) {
         setError(`Failed to load activities: ${err.message}`);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [firebaseInitializationError, currentMonthStart, currentMonthEnd, typeDetail.displayName, typeDetail.firestoreType, cacheKey]); // Added cacheKey

  const filteredEvents = useMemo(() => {
    const targetFirestoreType = typeDetail.firestoreType;
    
    console.log(`[MonthlyActivityDisplay Filter] Filtering for type: "${targetFirestoreType}" in month starting ${format(currentMonthStart, 'yyyy-MM-dd')}. Total events to process: ${events.length}`);

    return events
      .filter(event => {
        if (!(event.date instanceof Date && !isNaN(event.date.getTime()))) {
          console.warn(`[Event Filter - ${event.id}] Invalid event.date, skipping:`, event.date);
          return false;
        }

        const eventStartDate = startOfDay(event.date);
        const effectiveEventEndDate = event.endDate instanceof Date && !isNaN(event.endDate.getTime()) 
                                      ? endOfDay(event.endDate) 
                                      : endOfDay(event.date);

        const eventMatchesType = targetFirestoreType ? event.type === targetFirestoreType : (event.type !== 'event1' && event.type !== 'event2' && event.type !== 'event3'); // ensure 'others' doesn't pick up event1/2
        
        const eventIsInSelectedMonth = eventStartDate <= currentMonthEnd && effectiveEventEndDate >= currentMonthStart;
        
        // More detailed logging
        const shouldLog = (event.type === targetFirestoreType) || (!targetFirestoreType && !['event1', 'event2', 'event3'].includes(event.type || ''));
        if (shouldLog) {
           console.log(`[Event Filter Details - ID: ${event.id}]
            Event Title: "${event.title}", Type: ${event.type || 'N/A'}
            Raw Dates: Start=${event.date ? event.date.toISOString() : 'Invalid/Missing'}, End=${event.endDate ? event.endDate.toISOString() : 'N/A'}
            Processed Event Dates (for filter): Start=${format(eventStartDate, 'yyyy-MM-dd HH:mm:ss')}, End=${format(effectiveEventEndDate, 'yyyy-MM-dd HH:mm:ss')}
            Current Month Range (for filter): Start=${format(currentMonthStart, 'yyyy-MM-dd HH:mm:ss')}, End=${format(currentMonthEnd, 'yyyy-MM-dd HH:mm:ss')}
            Filter Criteria:
              - Matches Target Type ('${targetFirestoreType || 'any other (not event1/2/3)'}'): ${eventMatchesType}
              - Is In Selected Month: ${eventIsInSelectedMonth}
                (Condition: ${format(eventStartDate, 'MM/dd')} <= ${format(currentMonthEnd, 'MM/dd')} AND ${format(effectiveEventEndDate, 'MM/dd')} >= ${format(currentMonthStart, 'MM/dd')})
            Final Decision: ${eventMatchesType && eventIsInSelectedMonth ? 'INCLUDE' : 'EXCLUDE'}`);
        }
        return eventMatchesType && eventIsInSelectedMonth;
      })
      .sort((a, b) => {
        const dateDiff = a.date.getTime() - b.date.getTime();
        if (dateDiff !== 0) return dateDiff;

        if (a.type === 'event1' && b.type === 'event1') {
          const aSessionValue = a.session ? sessionOrder[a.session] : Infinity;
          const bSessionValue = b.session ? sessionOrder[b.session] : Infinity;
          if (aSessionValue !== bSessionValue) return aSessionValue - bSessionValue;
        }
        
        return (a.title || "").localeCompare(b.title || "");
      });
  }, [events, typeDetail.firestoreType, currentMonthStart, currentMonthEnd]);


  return (
    <div className="container mx-auto px-4 md:px-6">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-4"> 
        <div className="flex items-center gap-3">
          {PageIconComponent && <PageIconComponent className="h-8 w-8 text-primary" />}
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{pageTitle}</h1>
        </div>
        <Button variant="outline" asChild className="w-full sm:w-auto">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-center gap-4 mb-8 p-4 bg-card rounded-lg shadow">
        <Button variant="outline" size="icon" onClick={handlePreviousMonth} aria-label="Previous month">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="text-lg font-semibold text-foreground tabular-nums">
          {format(targetMonthDate, 'MMMM yyyy')}
        </span>
        <Button variant="outline" size="icon" onClick={handleNextMonth} aria-label="Next month">
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center text-muted-foreground py-10">
          <Loader2 className="mr-2 h-8 w-8 animate-spin" />
          Loading activities...
        </div>
      )}

      {error && (
        <div className="text-destructive p-4 bg-destructive/10 border border-destructive rounded-md">
          <div className="flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5" />
            <span className="font-semibold">Error Loading Activities</span>
          </div>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {!isLoading && !error && filteredEvents.length === 0 && (
        <Card className="shadow-md">
          <CardContent className="p-6 text-center text-muted-foreground">
            No {typeDetail.displayName.toLowerCase()} activities found for {format(targetMonthDate, 'MMMM yyyy')}.
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && filteredEvents.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredEvents.map(event => {
            let displayDateString: string | undefined = undefined;
            if (event.date instanceof Date && !isNaN(event.date.getTime())) {
              const sDay = startOfDay(event.date);
              let isMultiDayEvent = false;
              if (event.endDate instanceof Date && !isNaN(event.endDate.getTime())) {
                const eDay = startOfDay(event.endDate);
                if (!isSameDay(sDay, eDay)) {
                  isMultiDayEvent = true;
                }
              }
              if (isMultiDayEvent && event.endDate instanceof Date && !isNaN(event.endDate.getTime())) {
                const from = event.date < event.endDate ? event.date : event.endDate;
                const to = event.date < event.endDate ? event.endDate : event.date;
                displayDateString = format(from, 'PPP') + " - " + format(to, 'PPP');
              } else {
                displayDateString = format(event.date, 'PPP');
              }
            }

            return (
              <EventCard
                key={event.id}
                title={event.title}
                description={event.description}
                imageUrl={event.imageUrl}
                displayDate={displayDateString}
                session={event.session}
                eventType={event.type}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
