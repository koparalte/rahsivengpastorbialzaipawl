
"use client";

import { AppHeader } from '@/components/layout/header';
import { AppFooter } from '@/components/layout/footer';
import { Button } from "@/components/ui/button";
import { Users, Loader2, AlertTriangle, ChevronLeft, ChevronRight, CalendarCheck, CalendarClock, ArrowLeftCircle, ArrowRightCircle, Package, BarChart3 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from 'next/link';
import { DashboardBanner } from '@/components/dashboard/dashboard-banner';
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { EventCard } from '@/components/dashboard/event-card';
import { isSameDay, format, isSameMonth, startOfDay, endOfDay, isWithinInterval, addDays, subDays, startOfMonth } from 'date-fns';
import type { DateRange, Modifiers } from 'react-day-picker';
import { db, firebaseInitializationError } from '@/lib/firebase';
import { collection, onSnapshot, QueryDocumentSnapshot, DocumentData, Timestamp } from "firebase/firestore";
import { SummaryCard } from '@/components/dashboard/summary-card';
import { cn } from '@/lib/utils';

// Define the structure for an event
interface Event {
  id: string;
  date: Date; // Start date
  endDate?: Date; // Optional end date for multi-day events
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

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);
  const [currentMonth, setCurrentMonth] = React.useState<Date | undefined>(new Date()); // Initialize with current date
  const [isMounted, setIsMounted] = React.useState(false);

  const [events, setEvents] = useState<Event[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const [eventType1Count, setEventType1Count] = useState(0);
  const [eventType2Count, setEventType2Count] = useState(0);
  const [eventType3Count, setEventType3Count] = useState(0);

  const firebaseBannerImageUrl: string | undefined = "https://drive.google.com/uc?export=download&id=1dweAS9U6MDBV2X246Xf8IWzwXyVM24G1";

  const eventsContainerRef = useRef<HTMLDivElement>(null);

  const [canGoToPreviousEventDay, setCanGoToPreviousEventDay] = useState(false);
  const [canGoToNextEventDay, setCanGoToNextEventDay] = useState(false);

  useEffect(() => {
    // Set currentMonth initially for the calendar if not already set.
    if (!currentMonth) {
      setCurrentMonth(new Date());
    }
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !isLoadingEvents && selectedDate === undefined) {
      if (events.length > 0) {
        const today = startOfDay(new Date());
        const relevantEvents = events
          .filter(event => {
            const eventStartDate = startOfDay(event.date);
            const eventActualEndDate = event.endDate instanceof Date && !isNaN(event.endDate.getTime()) ? endOfDay(event.endDate) : eventStartDate;
            return eventActualEndDate >= today;
          })
          .sort((a, b) => {
            const startDateDiff = a.date.getTime() - b.date.getTime();
            if (startDateDiff !== 0) return startDateDiff;
            const aEndDate = a.endDate || a.date;
            const bEndDate = b.endDate || b.date;
            return aEndDate.getTime() - bEndDate.getTime();
          });

        if (relevantEvents.length > 0) {
          const nearestEvent = relevantEvents[0];
          setSelectedDate(nearestEvent.date);
          setCurrentMonth(nearestEvent.date); // Update calendar month to event's month
        } else {
          setSelectedDate(new Date());
          setCurrentMonth(new Date()); // Default to current month
        }
      } else {
        setSelectedDate(new Date());
        setCurrentMonth(new Date()); // Default to current month
      }
    }
  }, [isMounted, isLoadingEvents, events, selectedDate]);


  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      setCurrentMonth(date);
    }
  };

  useEffect(() => {
    if (firebaseInitializationError) {
      setEventsError(
        "Firebase Initialization Error: " +
        firebaseInitializationError +
        ". Please ensure your Firebase configuration in .env.local is correct and the server has been restarted. " +
        "Also, verify your Firestore 'calendarEvents' collection exists and security rules allow reads. " +
        "Check the browser console and terminal for more specific errors (especially any lines starting with [Firestore Data Check] in the browser console)."
      );
      setIsLoadingEvents(false);
      setEvents([]);
      return;
    }

    if (!db) {
      setEventsError("Firestore database is not available. Firebase might not have initialized correctly. Please check your .env.local configuration and restart the server. Also, verify your Firestore 'calendarEvents' collection exists and security rules allow reads. Check the browser console and terminal for more specific errors (especially any lines starting with [Firestore Data Check] in the browser console).");
      setIsLoadingEvents(false);
      setEvents([]);
      return;
    }

    setEventsError(null);
    setIsLoadingEvents(true);

    const eventsCollectionRef = collection(db, "calendarEvents");

    const unsubscribe = onSnapshot(eventsCollectionRef, (snapshot) => {
      const fetchedEvents: Event[] = snapshot.docs.map((docSnap: QueryDocumentSnapshot<DocumentData>) => {
        const data = docSnap.data();
        const eventDate = data.date instanceof Timestamp ? data.date.toDate() : new Date();

        if (!(data.date instanceof Timestamp)) {
            console.warn("[Firestore Data Check] Document with ID " + docSnap.id + " in 'calendarEvents' collection has a 'date' field that is not a Firestore Timestamp. Using current date as fallback.");
        }
        let eventEndDate: Date | undefined = undefined;
        if (data.endDate) {
          if (data.endDate instanceof Timestamp) {
            eventEndDate = data.endDate.toDate();
          } else {
            console.warn("[Firestore Data Check] Document with ID " + docSnap.id + " in 'calendarEvents' collection has an 'endDate' field that is not a Firestore Timestamp. It will be ignored.");
          }
        }

        if (!data.title) {
            console.warn("[Firestore Data Check] Document with ID " + docSnap.id + " in 'calendarEvents' collection is missing the 'title' field.");
        }
        if (!data.description) {
            console.warn("[Firestore Data Check] Document with ID " + docSnap.id + " in 'calendarEvents' collection is missing the 'description' field.");
        }

        let eventType: string | undefined = undefined;
        if (data.type) {
          if (typeof data.type === 'string' && ['event1', 'event2', 'event3'].includes(data.type)) {
            eventType = data.type;
          } else {
            console.warn("[Firestore Data Check] Document with ID " + docSnap.id + " has an invalid 'type' field: '" + data.type + "'. Should be 'event1', 'event2', 'event3', or left undefined for default. Event will use default styling.");
          }
        } else if (data.type === null || data.type === "") {
            console.warn("[Firestore Data Check] Document with ID " + docSnap.id + " has an empty or null 'type' field. Event will use default styling.");
        }

        let eventImageUrl: string | undefined = undefined;
        if (data.imageUrl) {
          if (typeof data.imageUrl === 'string') {
            eventImageUrl = data.imageUrl;
          } else {
            console.warn("[Firestore Data Check] Document with ID " + docSnap.id + " has an 'imageUrl' field that is not a string.");
          }
        }

        let eventSession: Event['session'] | undefined = undefined;
        if (data.session && (data.session === 'Zing' || data.session === 'Chawhnu' || data.session === 'Zan' || data.session === 'Chhun leh Zan')) {
            eventSession = data.session;
        } else if (data.session && data.session.trim() !== "") { // Check if session exists and is not empty before warning
            console.warn(`[Firestore Data Check] Document with ID ${docSnap.id} has an invalid 'session' field: '${data.session}'. It will be ignored.`);
        }


        return {
          id: docSnap.id,
          date: eventDate,
          endDate: eventEndDate instanceof Date && !isNaN(eventEndDate.getTime()) ? eventEndDate : undefined,
          title: data.title || "Untitled Event",
          description: data.description || "No description available.",
          type: eventType,
          imageUrl: eventImageUrl,
          session: eventSession,
        };
      });
      setEvents(fetchedEvents);
      setIsLoadingEvents(false);
      setEventsError(null);
    }, (err: any) => {
      console.error("Error fetching events from Firestore:", err);
      setEventsError("Failed to load events from Firestore: " + err.message + ". Check browser console for details (e.g., permission errors, incorrect project config) and ensure your Firestore rules allow reads to the 'calendarEvents' collection. Also, check your terminal where 'npm run dev' is running for server-side errors.");
      setIsLoadingEvents(false);
      setEvents([]);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (events.length > 0 && currentMonth) {
      const monthToDisplay = currentMonth; // Use the calendar's currentMonth state
      const eventsInSelectedMonth = events.filter(event => {
        const eventStartDate = startOfDay(event.date);
        const validEndDate = event.endDate instanceof Date && !isNaN(event.endDate.getTime()) ? endOfDay(event.endDate) : undefined;
        const monthStart = startOfMonth(monthToDisplay);
        const monthEnd = endOfDay(startOfMonth(addDays(monthStart, 35))); // Ensure we cover the full month display

        if (validEndDate && !isSameDay(eventStartDate, validEndDate)) {
            const intervalStart = eventStartDate < validEndDate ? eventStartDate : validEndDate;
            const intervalEnd = eventStartDate < validEndDate ? validEndDate : eventStartDate;
            // Check if the event's interval overlaps with the selected month's interval
            return intervalStart <= monthEnd && intervalEnd >= monthStart;
        } else {
            // For single day events, check if it's in the selected month
            return isSameMonth(eventStartDate, monthToDisplay);
        }
      });

      const count1 = eventsInSelectedMonth.filter(e => e.type === 'event1').length;
      const count2 = eventsInSelectedMonth.filter(e => e.type === 'event2').length;
      const count3 = eventsInSelectedMonth.filter(e => e.type === 'event3').length;

      setEventType1Count(count1);
      setEventType2Count(count2);
      setEventType3Count(count3);
    } else {
      setEventType1Count(0);
      setEventType2Count(0);
      setEventType3Count(0);
    }
  }, [events, currentMonth]);


  const distinctEventStartDates = useMemo(() => {
    if (!events || events.length === 0) return [];
    const startDateSet = new Set<number>();
    events.forEach(event => {
      startDateSet.add(startOfDay(event.date).getTime());
    });
    return Array.from(startDateSet).map(time => new Date(time)).sort((a, b) => a.getTime() - b.getTime());
  }, [events]);

  useEffect(() => {
    if (!selectedDate || distinctEventStartDates.length === 0) {
      setCanGoToPreviousEventDay(false);
      setCanGoToNextEventDay(distinctEventStartDates.length > 0);
      return;
    }
    const currentDayStart = startOfDay(selectedDate);

    let prevExists = false;
    for (let i = distinctEventStartDates.length - 1; i >= 0; i--) {
      if (startOfDay(distinctEventStartDates[i]).getTime() < currentDayStart.getTime()) {
        prevExists = true;
        break;
      }
    }
    setCanGoToPreviousEventDay(prevExists);

    let nextExists = false;
    for (const eventDay of distinctEventStartDates) {
      if (startOfDay(eventDay).getTime() > currentDayStart.getTime()) {
        nextExists = true;
        break;
      }
    }
    setCanGoToNextEventDay(nextExists);

  }, [selectedDate, distinctEventStartDates]);


  const handlePreviousEventDay = () => {
    if (!selectedDate || distinctEventStartDates.length === 0) return;
    const currentDayStart = startOfDay(selectedDate);
    let prevEventD: Date | undefined = undefined;
    for (let i = distinctEventStartDates.length - 1; i >= 0; i--) {
      if (startOfDay(distinctEventStartDates[i]).getTime() < currentDayStart.getTime()) {
        prevEventD = distinctEventStartDates[i];
        break;
      }
    }
    if (prevEventD) {
      setSelectedDate(prevEventD);
      setCurrentMonth(prevEventD);
    }
  };

  const handleNextEventDay = () => {
    if (!selectedDate && distinctEventStartDates.length > 0) {
        setSelectedDate(distinctEventStartDates[0]);
        setCurrentMonth(distinctEventStartDates[0]);
        return;
    }
    if (!selectedDate || distinctEventStartDates.length === 0) return;

    const currentDayStart = startOfDay(selectedDate);
    let nextEventD: Date | undefined = undefined;
    for (const eventDay of distinctEventStartDates) {
      if (startOfDay(eventDay).getTime() > currentDayStart.getTime()) {
        nextEventD = eventDay;
        break;
      }
    }
    if (nextEventD) {
      setSelectedDate(nextEventD);
      setCurrentMonth(nextEventD);
    }
  };


  const eventsForSelectedDay = selectedDate
    ? events
        .filter(event => {
          const sDate = startOfDay(selectedDate);
          const eventStartDate = startOfDay(event.date);
          const validEndDate = event.endDate instanceof Date && !isNaN(event.endDate.getTime()) ? endOfDay(event.endDate) : undefined;

          if (validEndDate && !isSameDay(eventStartDate, validEndDate)) {
            const intervalStart = eventStartDate < validEndDate ? eventStartDate : validEndDate;
            const intervalEnd = eventStartDate < validEndDate ? validEndDate : eventStartDate;
            return isWithinInterval(sDate, { start: intervalStart, end: intervalEnd });
          } else {
            return isSameDay(eventStartDate, sDate);
          }
        })
        .sort((a, b) => {
          const aIsEvent1 = a.type === 'event1';
          const bIsEvent1 = b.type === 'event1';

          // Prioritize 'Chhun leh Zan' session for 'event1' types
          const aSessionValue = aIsEvent1 && a.session ? sessionOrder[a.session] : Infinity;
          const bSessionValue = bIsEvent1 && b.session ? sessionOrder[b.session] : Infinity;
          
          if (aSessionValue !== bSessionValue) {
            return aSessionValue - bSessionValue;
          }
          return (a.title || "").localeCompare(b.title || "");
        })
    : [];

  const sundayMatcher = { dayOfWeek: [0] };

  const eventMarkers: Modifiers = {};
  const type1DatesAndRanges: (Date | DateRange)[] = [];
  const type2DatesAndRanges: (Date | DateRange)[] = [];
  const type3DatesAndRanges: (Date | DateRange)[] = [];
  const defaultDatesAndRanges: (Date | DateRange)[] = [];

  events.forEach(event => {
    const { date, endDate, type } = event;
    const validStartDate = startOfDay(date);
    const validEndDate = endDate instanceof Date && !isNaN(endDate.getTime()) ? startOfDay(endDate) : undefined;

    let targetArray;
    if (type === 'event1') {
      targetArray = type1DatesAndRanges;
    } else if (type === 'event2') {
      targetArray = type2DatesAndRanges;
    } else if (type === 'event3') {
      targetArray = type3DatesAndRanges;
    } else {
      targetArray = defaultDatesAndRanges;
    }

    if (validEndDate && !isSameDay(validStartDate, validEndDate)) {
      const fromDate = validStartDate < validEndDate ? validStartDate : validEndDate;
      const toDate = validStartDate < validEndDate ? validEndDate : validStartDate;
      targetArray.push({ from: fromDate, to: toDate });
    } else {
      targetArray.push(validStartDate);
    }
  });

  if (type1DatesAndRanges.length > 0) {
    eventMarkers.hasEventType1 = type1DatesAndRanges;
  }
  if (type2DatesAndRanges.length > 0) {
    eventMarkers.hasEventType2 = type2DatesAndRanges;
  }
  if (type3DatesAndRanges.length > 0) {
    eventMarkers.hasEventType3 = type3DatesAndRanges;
  }
  if (defaultDatesAndRanges.length > 0) {
    eventMarkers.hasEventDefault = defaultDatesAndRanges;
  }

  const eventModifiersClassNames = {
    hasEventType1: 'day-has-event-type1',
    hasEventType2: 'day-has-event-type2',
    hasEventType3: 'day-has-event-type3',
    hasEventDefault: 'day-has-event-default',
  };

  const currentMonthNameForStats = isMounted && currentMonth ? format(currentMonth, 'MMMM yyyy') : 'Loading...';
  const currentMonthQueryParam = isMounted && currentMonth ? format(currentMonth, 'yyyy-MM') : '';


  return (
    <div className="flex min-h-screen w-full flex-col">
      <AppHeader />
      <main className="flex-1 flex-col items-center justify-start gap-6 p-4 md:gap-8 md:p-6 lg:p-8 bg-background">
        <div className="w-full max-w-7xl mx-auto space-y-8">

          <DashboardBanner bannerImageUrl={firebaseBannerImageUrl} />

          <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
            <Link href={`/monthly-activities/rawngbawlna?month=${currentMonthQueryParam}`} passHref className="h-full transition-transform duration-150 ease-in-out hover:scale-[1.02] active:scale-[0.98]">
              <SummaryCard
                title={"Rawngbawlna " + (isMounted && currentMonth ? "(" + currentMonthNameForStats + ")" : '')}
                value={eventType1Count.toString()}
                icon={CalendarCheck}
              />
            </Link>
            <Link href={`/monthly-activities/hla-zir?month=${currentMonthQueryParam}`} passHref className="h-full transition-transform duration-150 ease-in-out hover:scale-[1.02] active:scale-[0.98]">
              <SummaryCard
                title={"Hla zir " + (isMounted && currentMonth ? "(" + currentMonthNameForStats + ")" : '')}
                value={eventType2Count.toString()}
                icon={CalendarClock}
              />
            </Link>
            <Link href={`/monthly-activities/others?month=${currentMonthQueryParam}`} passHref className="h-full transition-transform duration-150 ease-in-out hover:scale-[1.02] active:scale-[0.98]">
              <SummaryCard
                title={"Others " + (isMounted && currentMonth ? "(" + currentMonthNameForStats + ")" : '')}
                value={eventType3Count.toString()}
                icon={Package}
              />
            </Link>
            <Link href="/stats" passHref className="h-full transition-transform duration-150 ease-in-out hover:scale-[1.02] active:scale-[0.98]">
              <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col items-center justify-center text-center p-3 cursor-pointer h-full bg-card hover:bg-muted/50">
                <CardHeader className="p-1 pb-1 flex flex-col items-center">
                  <BarChart3 className="h-6 w-6 text-accent mb-1" />
                  <CardTitle className="text-sm font-medium text-card-foreground">Activity Statistics</CardTitle>
                </CardHeader>
                <CardContent className="p-1 pt-0">
                  <p className="text-xs text-muted-foreground">View monthly charts</p>
                </CardContent>
              </Card>
            </Link>
          </div>

          <div className="flex justify-center mb-8">
            <div className="flex flex-col items-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href="/members" passHref>
                      <Button
                        aria-label="View Members"
                        className="rounded-full w-16 h-16 shadow-md hover:shadow-lg transform transition-transform duration-150 ease-in-out active:scale-95 bg-[#129990] hover:bg-[#0F7A73] text-primary-foreground"
                      >
                        <Users className="h-10 w-10" />
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View Members</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <p className="mt-2 text-sm font-bold text-primary-foreground">Members</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
            <div className="lg:col-span-2">
              <Card className="shadow-lg">
                {isMounted && (
                  <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
                    <Button
                      onClick={handlePreviousEventDay}
                      disabled={!isMounted || !canGoToPreviousEventDay || !selectedDate}
                      aria-label="Previous event day"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <CardTitle className="text-xl font-semibold text-center mx-2">Rawngbawlna &amp; Hlazir Calendar</CardTitle>
                    <Button
                      onClick={handleNextEventDay}
                      disabled={!isMounted || !canGoToNextEventDay || !selectedDate}
                      aria-label="Next event day"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                )}
                <CardContent className="min-h-[200px] p-4 space-y-4">
                  {!isMounted || selectedDate === undefined ? (
                    <div className="flex items-center justify-center text-muted-foreground h-full min-h-[160px]">
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                       Loading events or selecting date...
                    </div>
                  ) : (
                    <>
                      {isLoadingEvents ? (
                        <div className="flex items-center justify-center text-muted-foreground">
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Loading events...
                        </div>
                      ) : eventsError ? (
                        <div className="text-destructive p-4 bg-destructive/10 border border-destructive rounded-md">
                          <div className="flex items-center">
                            <AlertTriangle className="mr-2 h-5 w-5" />
                            <span className="font-semibold">Error Loading Events</span>
                          </div>
                          <p className="text-sm mt-1">{eventsError}</p>
                          {(eventsError.toLowerCase().includes("firebase") || eventsError.toLowerCase().includes("firestore")) &&
                            <p className="mt-2 text-xs">Please ensure your Firebase configuration in <code className="bg-muted px-1 py-0.5 rounded">.env.local</code> is correct and the server has been restarted. Also, verify your Firestore 'calendarEvents' collection exists, has the correct document structure (with a Timestamp field named 'date', an optional Timestamp field 'endDate', string fields 'title', 'description', an optional string field 'type' which can be 'event1' or 'event2', and an optional string field 'imageUrl'), and security rules allow reads. Check the browser console and terminal for more specific errors (especially any lines starting with [Firestore Data Check] in the browser console).</p>
                          }
                        </div>
                      ) : selectedDate ? (
                        eventsForSelectedDay.length > 0 ? (
                          <div
                            ref={eventsContainerRef}
                            className={cn(
                              "pb-2 space-y-4"
                            )}
                          >
                            {eventsForSelectedDay.map(event => {
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
                                  displayDateString = format(from, 'dd MMM') + " - " + format(to, 'dd MMM');
                                } else {
                                  displayDateString = format(event.date, 'dd MMM');
                                }
                              }

                              return (
                                <div
                                  key={event.id}
                                  className={cn(
                                    "w-full"
                                  )}
                                >
                                  <EventCard
                                    title={event.title}
                                    description={event.description}
                                    imageUrl={event.imageUrl}
                                    displayDate={displayDateString}
                                    session={event.session}
                                    eventType={event.type}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-center py-4">
                            {"No events scheduled for " + format(selectedDate, 'dd MMM') + "."}
                          </p>
                        )
                      ) : (
                        <p className="text-muted-foreground text-center py-4">
                          Please select a day from the calendar to view events.
                        </p>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1 space-y-6">
              <Card className="shadow-lg w-full">
                 <CardHeader className="p-4">
                  <div className="p-3 border rounded-md bg-muted/30 shadow-sm space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="h-3 w-3 rounded-full inline-block" style={{ backgroundColor: 'hsl(var(--destructive))' }} />
                      <span className="text-xs text-card-foreground uppercase font-bold">RAWNGBAWLNA</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="h-3 w-3 rounded-full inline-block" style={{ backgroundColor: 'hsl(var(--primary))' }} />
                      <span className="text-xs text-card-foreground uppercase font-bold">HLA ZIR</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="h-3 w-3 rounded-full inline-block" style={{ backgroundColor: 'hsl(var(--chart-3))' }} />
                      <span className="text-xs text-card-foreground uppercase font-bold">OTHERS</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex justify-center p-2 sm:p-4">
                  {isMounted && currentMonth ? (
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      month={currentMonth}
                      onMonthChange={setCurrentMonth}
                      onSelect={handleDateSelect}
                      className="rounded-md"
                      modifiers={{
                        sunday: sundayMatcher,
                        ...eventMarkers
                      }}
                      modifiersClassNames={{
                        sunday: 'text-destructive',
                        ...eventModifiersClassNames
                      }}
                      components={{
                        IconLeft: ({ ...props }) => <ArrowLeftCircle className="h-5 w-5" {...props} />,
                        IconRight: ({ ...props }) => <ArrowRightCircle className="h-5 w-5" {...props} />,
                      }}
                    />
                  ) : (
                    <div className="rounded-md p-3 h-[298px] w-full max-w-[284px] mx-auto flex items-center justify-center bg-transparent">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

        </div>
      </main>
      <AppFooter />
    </div>
  );
}
