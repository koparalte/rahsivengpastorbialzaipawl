
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CalendarCheck, CalendarClock, Package as PackageIcon, Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { EventCard } from '@/components/dashboard/event-card';
import { db, firebaseInitializationError } from '@/lib/firebase';
import { collection, onSnapshot, QueryDocumentSnapshot, DocumentData, Timestamp } from "firebase/firestore";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';

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

  const currentMonthStart = useMemo(() => startOfDay(startOfMonth(new Date())), []);
  const currentMonthEnd = useMemo(() => endOfDay(endOfMonth(new Date())), []);

  useEffect(() => {
    const monthName = format(currentMonthStart, 'MMMM yyyy');
    setPageTitle(`${typeDetail.displayName} for ${monthName}`);
    const IconToUse = clientIconMapping[typeDetail.firestoreType] || clientIconMapping.default;
    setPageIconComponent(() => IconToUse);
  }, [activityTypeParam, typeDetail, currentMonthStart]);

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

    console.log(`[MonthlyActivityDisplay] Page for type: ${typeDetail.displayName}. Current system month range for filtering:`,
      format(currentMonthStart, 'yyyy-MM-dd HH:mm:ss'),
      'to',
      format(currentMonthEnd, 'yyyy-MM-dd HH:mm:ss')
    );

    const eventsCollectionRef = collection(db, "calendarEvents");
    const unsubscribe = onSnapshot(eventsCollectionRef, (snapshot) => {
      const fetchedEvents: Event[] = snapshot.docs.map((docSnap: QueryDocumentSnapshot<DocumentData>) => {
        const data = docSnap.data();

        // Log raw date types from Firestore
        console.log(`[Firestore Data Processing] Event ID: ${docSnap.id}, Raw data.date type: ${typeof data.date}, isTimestamp: ${data.date instanceof Timestamp}`, data.date);
        if (data.endDate) {
          console.log(`[Firestore Data Processing] Event ID: ${docSnap.id}, Raw data.endDate type: ${typeof data.endDate}, isTimestamp: ${data.endDate instanceof Timestamp}`, data.endDate);
        }


        const eventDate = data.date instanceof Timestamp ? data.date.toDate() : new Date();
        if (!(data.date instanceof Timestamp)) {
            console.warn(`[Firestore Data Check - ${docSnap.id}] 'date' field is not a Firestore Timestamp. Fallback to current date.`);
        }

        let eventEndDate: Date | undefined = undefined;
        if (data.endDate) {
          if (data.endDate instanceof Timestamp) {
            eventEndDate = data.endDate.toDate();
          } else {
            console.warn(`[Firestore Data Check - ${docSnap.id}] 'endDate' field is present but not a Firestore Timestamp. It will be ignored.`);
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
      setIsLoading(false);
    }, (err) => {
      console.error("Error fetching monthly activities:", err);
      setError(`Failed to load activities: ${err.message}`);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [firebaseInitializationError, currentMonthStart, currentMonthEnd, typeDetail.displayName, typeDetail.firestoreType]);

  const filteredEvents = useMemo(() => {
    const targetFirestoreType = typeDetail.firestoreType;
    
    console.log(`[MonthlyActivityDisplay Filter] Filtering for type: "${targetFirestoreType}" in month starting ${format(currentMonthStart, 'yyyy-MM-dd')}. Total events to process: ${events.length}`);

    return events
      .filter(event => {
        // Ensure event.date is a valid Date object before proceeding
        if (!(event.date instanceof Date && !isNaN(event.date.getTime()))) {
          console.warn(`[Event Filter - ${event.id}] Invalid event.date, skipping:`, event.date);
          return false;
        }

        const eventStartDate = startOfDay(event.date);
        // Effective end date: use event.endDate if valid, otherwise use the end of the event.date (for single-day events)
        const effectiveEventEndDate = event.endDate instanceof Date && !isNaN(event.endDate.getTime()) 
                                      ? endOfDay(event.endDate) 
                                      : endOfDay(event.date); // For single-day events, consider it to span the whole day for range checks

        const eventMatchesType = targetFirestoreType ? event.type === targetFirestoreType : (event.type !== 'event1' && event.type !== 'event2'); // Default to 'others' if no target type
        
        // Standard range overlap check:
        // An event overlaps with the current month if:
        // - the event starts on or before the last day of the current month, AND
        // - the event ends on or after the first day of the current month.
        const eventIsInCurrentMonth = eventStartDate <= currentMonthEnd && effectiveEventEndDate >= currentMonthStart;
        
        // Log details for each event being filtered if it's of the target type or if detailed logging is globally enabled
        // This log will help understand why an event is included or excluded.
        if (event.type === targetFirestoreType || !targetFirestoreType) { // Log if type matches OR if we are showing "others" (no specific targetType)
            console.log(`[Event Filter Details - ID: ${event.id}]
              Event Title: "${event.title}", Type: ${event.type || 'N/A'}
              Raw Dates: Start=${event.date ? event.date.toISOString() : 'Invalid/Missing'}, End=${event.endDate ? event.endDate.toISOString() : 'N/A'}
              Processed Event Dates (for filter): Start=${format(eventStartDate, 'yyyy-MM-dd HH:mm:ss')}, End=${format(effectiveEventEndDate, 'yyyy-MM-dd HH:mm:ss')}
              Current Month Range (for filter): Start=${format(currentMonthStart, 'yyyy-MM-dd HH:mm:ss')}, End=${format(currentMonthEnd, 'yyyy-MM-dd HH:mm:ss')}
              Filter Criteria:
                - Matches Target Type ('${targetFirestoreType || 'any other'}'): ${eventMatchesType}
                - Is In Current Month: ${eventIsInCurrentMonth}
                  (Condition: ${format(eventStartDate, 'MM/dd')} <= ${format(currentMonthEnd, 'MM/dd')} AND ${format(effectiveEventEndDate, 'MM/dd')} >= ${format(currentMonthStart, 'MM/dd')})
              Final Decision: ${eventMatchesType && eventIsInCurrentMonth ? 'INCLUDE' : 'EXCLUDE'}`);
        }

        return eventMatchesType && eventIsInCurrentMonth;
      })
      .sort((a, b) => { // Sort by start date, then by session for type 'event1', then by title
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
      <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
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
            No {typeDetail.displayName.toLowerCase()} activities found for the current month ({format(currentMonthStart, 'MMMM yyyy')}).
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
                // Ensure from date is always before to date for display
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
