
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CalendarCheck, CalendarClock, Package as PackageIcon, Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { EventCard } from '@/components/dashboard/event-card';
import { db, firebaseInitializationError } from '@/lib/firebase';
import { collection, onSnapshot, QueryDocumentSnapshot, DocumentData, Timestamp } from "firebase/firestore";
import { format, startOfMonth, endOfMonth, isWithinInterval, startOfDay, isSameDay, endOfDay } from 'date-fns';
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

// Client-side mapping to determine the icon
const clientIconMapping: { [key: string]: React.ElementType } = {
  event1: CalendarCheck,
  event2: CalendarClock,
  event3: PackageIcon,
  default: PackageIcon, // Fallback icon
};

interface MonthlyActivityDisplayProps {
  activityTypeParam: string;
  typeDetail: { // This prop now contains only serializable data
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

  const currentMonthStart = useMemo(() => startOfMonth(new Date()), []);
  const currentMonthEnd = useMemo(() => endOfMonth(new Date()), []);

  useEffect(() => {
    const monthName = format(currentMonthStart, 'MMMM yyyy');
    setPageTitle(`${typeDetail.displayName} for ${monthName}`);
    // Determine the icon on the client side
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

    const eventsCollectionRef = collection(db, "calendarEvents");
    const unsubscribe = onSnapshot(eventsCollectionRef, (snapshot) => {
      const fetchedEvents: Event[] = snapshot.docs.map((docSnap: QueryDocumentSnapshot<DocumentData>) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          date: data.date instanceof Timestamp ? data.date.toDate() : new Date(),
          endDate: data.endDate instanceof Timestamp ? data.endDate.toDate() : undefined,
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
  }, [firebaseInitializationError]);

  const filteredEvents = useMemo(() => {
    const targetFirestoreType = typeDetail.firestoreType;

    return events
      .filter(event => {
        const eventStartDate = startOfDay(event.date);
        const eventMatchesType = targetFirestoreType ? event.type === targetFirestoreType : (event.type !== 'event1' && event.type !== 'event2'); // Adjust for "others" if it means non-event1/event2

        let eventIsInCurrentMonth = false;
        const validEndDate = event.endDate instanceof Date && !isNaN(event.endDate.getTime()) ? endOfDay(event.endDate) : undefined;

        if (validEndDate && !isSameDay(eventStartDate, validEndDate)) {
          const interval = { start: eventStartDate, end: validEndDate };
          eventIsInCurrentMonth =
            isWithinInterval(currentMonthStart, interval) ||
            isWithinInterval(currentMonthEnd, interval) ||
            (eventStartDate < currentMonthStart && validEndDate > currentMonthEnd);
        } else {
          eventIsInCurrentMonth = isWithinInterval(eventStartDate, { start: currentMonthStart, end: currentMonthEnd });
        }

        return eventMatchesType && eventIsInCurrentMonth;
      })
      .sort((a, b) => {
        const dateDiff = a.date.getTime() - b.date.getTime();
        if (dateDiff !== 0) return dateDiff;

        const aSessionValue = a.session ? sessionOrder[a.session] : Infinity;
        const bSessionValue = b.session ? sessionOrder[b.session] : Infinity;
        if (aSessionValue !== bSessionValue) return aSessionValue - bSessionValue;

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
            No activities found for this type in the current month.
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
