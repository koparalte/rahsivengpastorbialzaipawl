
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
// AppHeader and AppFooter are in the layout, no need to import them here directly
// import { AppHeader } from '@/components/layout/header'; 
// import { AppFooter } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CalendarCheck, CalendarClock, Package as PackageIcon, Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { EventCard } from '@/components/dashboard/event-card';
import { db, firebaseInitializationError } from '@/lib/firebase';
import { collection, onSnapshot, QueryDocumentSnapshot, DocumentData, Timestamp } from "firebase/firestore";
import { format, startOfMonth, endOfMonth, isWithinInterval, startOfDay, isSameDay } from 'date-fns';
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

// This specific mapping is used for client-side filtering based on firestoreType
// It should align with the server-side typeMapping in page.tsx for consistency if used directly.
// However, for filtering, we will rely on the firestoreType passed via typeDetail prop.
const clientTypeMapping: { [key: string]: { firestoreType: string } } = {
  rawngbawlna: { firestoreType: 'event1' },
  'hla-zir': { firestoreType: 'event2' },
  others: { firestoreType: 'event3' },
};


const sessionOrder: Record<NonNullable<Event['session']>, number> = {
  'Chhun leh Zan': 0,
  'Zing': 1,
  'Chawhnu': 2,
  'Zan': 3,
};

interface MonthlyActivityDisplayProps {
  activityTypeParam: string;
  typeDetail: {
    firestoreType: string; // This will be the type used for filtering (e.g., 'event1')
    displayName: string;
    icon: React.ElementType;
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
    setPageIconComponent(() => typeDetail.icon);
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
  }, [firebaseInitializationError]); // Added firebaseInitializationError to dependency array

  const filteredEvents = useMemo(() => {
    // Use typeDetail.firestoreType directly for filtering. This comes from the server component.
    const targetFirestoreType = typeDetail.firestoreType;

    if (!targetFirestoreType) {
        // If firestoreType is empty (e.g., for an unmapped 'others' from a direct URL visit),
        // it implies we shouldn't filter by a specific type, or perhaps show nothing/all 'other' types.
        // For now, if no specific firestoreType is provided by the server component, show no events.
        // This behavior can be adjusted based on desired outcome for unmapped types.
        // console.warn(`No specific firestoreType provided for ${activityTypeParam}. Displaying no events.`);
        // return [];
    }
    
    return events
      .filter(event => {
        const eventStartDate = startOfDay(event.date);
        // Only filter by type if targetFirestoreType is non-empty.
        // If targetFirestoreType is empty, it means we're showing 'others' which might not have a specific type field
        // or could be any type not event1 or event2.
        // The current logic relies on server passing the correct typeDetail.firestoreType.
        const eventMatchesType = targetFirestoreType ? event.type === targetFirestoreType : true; // Adjust if 'others' should only include events without a type or with type 'event3'
        
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
  }, [events, activityTypeParam, currentMonthStart, currentMonthEnd, typeDetail.firestoreType]);


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
