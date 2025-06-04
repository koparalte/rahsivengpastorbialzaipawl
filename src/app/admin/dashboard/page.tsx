
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, Edit3, Trash2, LayoutDashboard, Calendar as CalendarIcon, Image as ImageIcon, Type, FileText, ListChecks, AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db, firebaseInitializationError } from '@/lib/firebase';
import { collection, addDoc, Timestamp, getDocs, deleteDoc, doc, onSnapshot, QueryDocumentSnapshot, DocumentData, updateDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from '@/hooks/use-toast';
import React, { useState, useTransition, useEffect, useMemo } from 'react';
import { format, startOfDay } from 'date-fns';

const NO_IMAGE_SELECTED_VALUE = "--NO_IMAGE_SELECTED--";
const DEFAULT_EVENT_TYPE_VALUE = "--";

const eventFormSchema = z.object({
  id: z.string().optional(), // For editing
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  date: z.date({ required_error: "Date is required." }),
  endDate: z.date().optional(),
  type: z.string().optional(),
  imageUrl: z.string().url("Invalid URL, ensure it's a full URL.").optional().or(z.literal('')).or(z.literal(NO_IMAGE_SELECTED_VALUE)),
}).refine(data => {
  if (data.endDate && data.date > data.endDate) {
    return false;
  }
  return true;
}, {
  message: "End date cannot be earlier than the start date.",
  path: ["endDate"],
});

type EventFormValues = z.infer<typeof eventFormSchema>;

interface EventItem extends EventFormValues {
  id: string; 
}


const bcmImageUrls = [
  { name: "None", value: NO_IMAGE_SELECTED_VALUE },
  { name: "BCM Rahsiveng", value: "https://drive.google.com/uc?export=download&id=1krFnm-8fErnJnM5dPKX85lQHHmgzyPms" },
  { name: "BCM Moria", value: "https://drive.google.com/uc?export=download&id=1XYASWYTbjAx26o5rQl-6oB525C0dRH6f" },
  { name: "BCM Venghlun", value: "https://drive.google.com/uc?export=download&id=1XCf90Hbx0gexMJfWk1RVzcMIYkKg4L2b" },
  { name: "BCM Bethel", value: "https://drive.google.com/uc?export=download&id=1KUneQwWamPFyJSHUbr-xVADfeDN80oO_" },
  { name: "BCM Sazaikawn", value: "https://drive.google.com/uc?export=download&id=1VlXtBN7CUT4JfcYOHR-p-RNRcj6BKvH_" },
];

export default function AdminDashboardPage() {
  const [isAddEventDialogOpen, setIsAddEventDialogOpen] = useState(false);
  const [isEditEventDialogOpen, setIsEditEventDialogOpen] = useState(false);
  const [isSubmitting, startTransition] = useTransition();
  const { toast } = useToast();
  const [currentEvent, setCurrentEvent] = useState<EventItem | null>(null);

  const [manageableEvents, setManageableEvents] = useState<EventItem[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  
  const [eventToDelete, setEventToDelete] = useState<EventItem | null>(null);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [isDeletingEvent, startDeleteEventTransition] = useTransition();

  const [showPastEventsToModify, setShowPastEventsToModify] = useState(false);
  const [showPastEventsToDelete, setShowPastEventsToDelete] = useState(false);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      date: undefined,
      endDate: undefined,
      type: DEFAULT_EVENT_TYPE_VALUE,
      imageUrl: NO_IMAGE_SELECTED_VALUE,
    },
  });

  const isEventPast = (event: EventItem): boolean => {
    const today = startOfDay(new Date());
    const eventEffectiveEndDate = event.endDate ? startOfDay(event.endDate) : startOfDay(event.date as Date);
    return eventEffectiveEndDate < today;
  };

  const upcomingEvents = useMemo(() => 
    manageableEvents.filter(event => !isEventPast(event)).sort((a, b) => (b.date as Date).getTime() - (a.date as Date).getTime()),
    [manageableEvents]
  );

  const pastEvents = useMemo(() => 
    manageableEvents.filter(event => isEventPast(event)).sort((a, b) => (b.date as Date).getTime() - (a.date as Date).getTime()),
    [manageableEvents]
  );

  const onSubmit: SubmitHandler<EventFormValues> = async (data) => {
    if (firebaseInitializationError || !db) {
      toast({
        title: "Error",
        description: `Firebase is not configured correctly: ${firebaseInitializationError || "Firestore unavailable."}`,
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      try {
        const eventData: any = {
          title: data.title,
          description: data.description,
          date: Timestamp.fromDate(data.date as Date), 
          updatedAt: serverTimestamp(),
        };

        if (data.endDate) {
          eventData.endDate = Timestamp.fromDate(data.endDate);
        } else {
          eventData.endDate = null; 
        }
        
        if (data.type && data.type !== DEFAULT_EVENT_TYPE_VALUE) {
          eventData.type = data.type;
        } else {
           eventData.type = null; 
        }
        
        if (data.imageUrl && data.imageUrl !== NO_IMAGE_SELECTED_VALUE && data.imageUrl.trim() !== "") {
          eventData.imageUrl = data.imageUrl;
        } else {
          eventData.imageUrl = null; 
        }

        if (currentEvent && currentEvent.id) { 
          const eventRef = doc(db, "calendarEvents", currentEvent.id);
          await updateDoc(eventRef, eventData);
          toast({
            title: "Success!",
            description: "Event updated successfully.",
          });
          setIsEditEventDialogOpen(false);
        } else { 
          eventData.createdAt = serverTimestamp();
          await addDoc(collection(db, "calendarEvents"), eventData);
          toast({
            title: "Success!",
            description: "Rawngbawlna/Hla zir added successfully.",
          });
          setIsAddEventDialogOpen(false);
        }
        form.reset({ 
            title: "", 
            description: "", 
            date: undefined, 
            endDate: undefined, 
            type: DEFAULT_EVENT_TYPE_VALUE, 
            imageUrl: NO_IMAGE_SELECTED_VALUE 
        });
        setCurrentEvent(null); 
      } catch (error) {
        console.error("Error saving event to Firestore:", error);
        toast({
          title: "Error",
          description: "Failed to save Rawngbawlna/Hla zir. Please check console for details.",
          variant: "destructive",
        });
      }
    });
  };

  useEffect(() => {
    if (firebaseInitializationError || !db) {
      setEventsError(`Firebase is not configured: ${firebaseInitializationError || "Firestore unavailable."}`);
      setIsLoadingEvents(false);
      return;
    }

    setIsLoadingEvents(true);
    const eventsCollectionRef = collection(db, "calendarEvents");
    const unsubscribe = onSnapshot(eventsCollectionRef, (snapshot) => {
      const fetchedEvents: EventItem[] = snapshot.docs.map((docSnap: QueryDocumentSnapshot<DocumentData>) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: data.title || "Untitled Event",
          description: data.description || "",
          date: data.date instanceof Timestamp ? data.date.toDate() : new Date(),
          endDate: data.endDate instanceof Timestamp ? data.endDate.toDate() : undefined,
          type: data.type || DEFAULT_EVENT_TYPE_VALUE,
          imageUrl: data.imageUrl || NO_IMAGE_SELECTED_VALUE,
        };
      });
      setManageableEvents(fetchedEvents); 
      setIsLoadingEvents(false);
      setEventsError(null);
    }, (error) => {
      console.error("Error fetching events:", error);
      setEventsError("Failed to load events. Please check console.");
      setIsLoadingEvents(false);
    });

    return () => unsubscribe();
  }, [db, firebaseInitializationError]);

  const handleEditEventClick = (event: EventItem) => {
    setCurrentEvent(event);
    form.reset({
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.date,
      endDate: event.endDate,
      type: event.type || DEFAULT_EVENT_TYPE_VALUE,
      imageUrl: event.imageUrl || NO_IMAGE_SELECTED_VALUE,
    });
    setIsEditEventDialogOpen(true);
  };
  
  const openAddEventDialog = () => {
    setCurrentEvent(null); 
    form.reset({ 
        title: "", 
        description: "", 
        date: undefined, 
        endDate: undefined, 
        type: DEFAULT_EVENT_TYPE_VALUE, 
        imageUrl: NO_IMAGE_SELECTED_VALUE 
    });
    setIsAddEventDialogOpen(true);
  };


  const handleDeleteEventClick = (event: EventItem) => {
    setEventToDelete(event);
    setIsConfirmDeleteDialogOpen(true);
  };

  const confirmDeleteEvent = async () => {
    if (!eventToDelete || !db) return;

    startDeleteEventTransition(async () => {
      try {
        await deleteDoc(doc(db, "calendarEvents", eventToDelete.id));
        toast({
          title: "Event Deleted",
          description: `"${eventToDelete.title}" has been successfully deleted.`,
        });
      } catch (error) {
        console.error("Error deleting event:", error);
        toast({
          title: "Error Deleting Event",
          description: "Failed to delete the event. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsConfirmDeleteDialogOpen(false);
        setEventToDelete(null);
      }
    });
  };
  
  const renderEventForm = (isEditing: boolean) => (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
      <div>
        <Label htmlFor="title" className="flex items-center gap-1 mb-1"><FileText className="h-4 w-4" />Title</Label>
        <Input id="title" {...form.register("title")} placeholder="Event Title" />
        {form.formState.errors.title && <p className="text-xs text-destructive mt-1">{form.formState.errors.title.message}</p>}
      </div>
      <div>
        <Label htmlFor="description" className="flex items-center gap-1 mb-1"><FileText className="h-4 w-4" />Description</Label>
        <Textarea id="description" {...form.register("description")} placeholder="Event Description" />
        {form.formState.errors.description && <p className="text-xs text-destructive mt-1">{form.formState.errors.description.message}</p>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="date" className="flex items-center gap-1 mb-1"><CalendarIcon className="h-4 w-4" />Start Date</Label>
          <Controller
            control={form.control}
            name="date"
            render={({ field }) => (
              <DatePicker
                date={field.value}
                setDate={field.onChange}
                placeholder="Select start date"
              />
            )}
          />
          {form.formState.errors.date && <p className="text-xs text-destructive mt-1">{form.formState.errors.date.message}</p>}
        </div>
        <div>
          <Label htmlFor="endDate" className="flex items-center gap-1 mb-1"><CalendarIcon className="h-4 w-4" />End Date (Optional)</Label>
           <Controller
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <DatePicker
                date={field.value}
                setDate={field.onChange}
                placeholder="Select end date"
                disabled={(date) => form.getValues("date") ? date < form.getValues("date") : false}
              />
            )}
          />
          {form.formState.errors.endDate && <p className="text-xs text-destructive mt-1">{form.formState.errors.endDate.message}</p>}
        </div>
      </div>
      <div>
        <Label htmlFor="type" className="flex items-center gap-1 mb-1"><Type className="h-4 w-4" />Event Type (Optional)</Label>
        <Controller
          control={form.control}
          name="type"
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value || DEFAULT_EVENT_TYPE_VALUE}>
              <SelectTrigger id="type">
                <SelectValue placeholder="Select event type (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_EVENT_TYPE_VALUE}>Default</SelectItem>
                <SelectItem value="event1">Rawngbawlna</SelectItem>
                <SelectItem value="event2">Hla Zir</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {form.formState.errors.type && <p className="text-xs text-destructive mt-1">{form.formState.errors.type.message}</p>}
      </div>
      <div>
        <Label htmlFor="imageUrl" className="flex items-center gap-1 mb-1"><ImageIcon className="h-4 w-4" />Image (Optional)</Label>
        <Controller
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value || NO_IMAGE_SELECTED_VALUE}>
              <SelectTrigger id="imageUrl">
                <SelectValue placeholder="Select BCM Image (optional)" />
              </SelectTrigger>
              <SelectContent>
                {bcmImageUrls.map(bcm => (
                  <SelectItem key={bcm.name} value={bcm.value}>
                    {bcm.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {form.formState.errors.imageUrl && <p className="text-xs text-destructive mt-1">{form.formState.errors.imageUrl.message}</p>}
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={isSubmitting}>
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? "Save Changes" : "Add Rawngbawlna/Hla zir"}
        </Button>
      </DialogFooter>
    </form>
  );

  const renderEventList = (eventsToList: EventItem[], actionType: 'edit' | 'delete') => {
    if (eventsToList.length === 0) {
      return <p className="text-sm text-muted-foreground text-center py-2">No events in this category.</p>;
    }
    return (
      <div className="space-y-2">
        {eventsToList.map((event) => (
          <div key={event.id} className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50 transition-colors">
            <div>
              <p className="font-medium text-sm text-foreground">{event.title}</p>
              <p className="text-xs text-muted-foreground">{format(event.date as Date, "PPP")}</p>
            </div>
            {actionType === 'edit' ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEditEventClick(event)}
                className="text-primary hover:text-primary hover:bg-primary/10"
                aria-label={`Edit event ${event.title}`}
                disabled={isSubmitting}
              >
                <Edit3 className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteEventClick(event)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                aria-label={`Delete event ${event.title}`}
                disabled={isDeletingEvent}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    );
  };


  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="h-8 w-8 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Admin Dashboard</h1>
        </div>
        <Button variant="outline" asChild className="w-full sm:w-auto">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Main Site
          </Link>
        </Button>
      </div>

      <CardDescription className="mb-8 text-center sm:text-left">
        Manage calendar events. Add, edit, or delete events linked to your Firebase database.
      </CardDescription>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Add Event Dialog */}
        <Dialog open={isAddEventDialogOpen} onOpenChange={setIsAddEventDialogOpen}>
          <DialogTrigger asChild>
            <Card className="shadow-md hover:shadow-lg transition-shadow cursor-pointer" onClick={openAddEventDialog}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <PlusCircle className="h-5 w-5 text-primary" />
                  Add New Rawngbawlna/Hla zir
                </CardTitle>
                <CardDescription>Create a new Rawngbawlna or Hla zir for the calendar.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Click here to open the form for inputting details.</p>
                <Button className="w-full">
                  Add Rawngbawlna/Hla zir
                </Button>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Rawngbawlna/Hla zir</DialogTitle>
              <DialogDescription>
                Fill in the details below to add a new Rawngbawlna or Hla zir to the calendar.
              </DialogDescription>
            </DialogHeader>
            {renderEventForm(false)}
          </DialogContent>
        </Dialog>

        {/* Modify Event Card and Dialog */}
        <Dialog open={isEditEventDialogOpen} onOpenChange={setIsEditEventDialogOpen}>
            <Card className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Edit3 className="h-5 w-5 text-primary" />
                  Modify Existing Events
                </CardTitle>
                <CardDescription>Edit or update current calendar events.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoadingEvents ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
                    <span className="text-muted-foreground">Loading events...</span>
                  </div>
                ) : eventsError ? (
                  <div className="text-destructive p-3 bg-destructive/10 border border-destructive rounded-md">
                    <div className="flex items-center">
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      <span className="font-medium text-sm">Error</span>
                    </div>
                    <p className="text-xs mt-1">{eventsError}</p>
                  </div>
                ) : manageableEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No events available to modify.</p>
                ) : (
                  <>
                    <div className="flex items-center space-x-2 py-2">
                      <Switch
                        id="toggle-past-modify"
                        checked={showPastEventsToModify}
                        onCheckedChange={setShowPastEventsToModify}
                        aria-label={showPastEventsToModify ? "Switch to show upcoming events" : "Switch to show past events"}
                        className="data-[state=unchecked]:bg-border"
                      />
                      <Label htmlFor="toggle-past-modify" className="text-sm cursor-pointer">
                        {showPastEventsToModify ? "Showing Past Events" : "Showing Upcoming Events"}
                      </Label>
                    </div>
                    <div className="max-h-80 overflow-y-auto space-y-4 pr-2">
                      {showPastEventsToModify ? (
                        <div>
                          <h4 className="text-md font-semibold mb-2 text-primary">Past Events</h4>
                          {renderEventList(pastEvents, 'edit')}
                        </div>
                      ) : (
                        <div>
                          <h4 className="text-md font-semibold mb-2 text-primary">Upcoming Events</h4>
                          {renderEventList(upcomingEvents, 'edit')}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Event</DialogTitle>
              <DialogDescription>
                Modify the details of the event below.
              </DialogDescription>
            </DialogHeader>
            {renderEventForm(true)}
          </DialogContent>
        </Dialog>

        {/* Delete Events Card */}
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Events
            </CardTitle>
            <CardDescription>Remove events from the calendar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingEvents ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
                <span className="text-muted-foreground">Loading events...</span>
              </div>
            ) : eventsError ? (
              <div className="text-destructive p-3 bg-destructive/10 border border-destructive rounded-md">
                <div className="flex items-center">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  <span className="font-medium text-sm">Error</span>
                </div>
                <p className="text-xs mt-1">{eventsError}</p>
              </div>
            ) : manageableEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No events available to delete.</p>
            ) : (
              <>
                <div className="flex items-center space-x-2 py-2">
                  <Switch
                    id="toggle-past-delete"
                    checked={showPastEventsToDelete}
                    onCheckedChange={setShowPastEventsToDelete}
                    aria-label={showPastEventsToDelete ? "Switch to show upcoming events for deletion" : "Switch to show past events for deletion"}
                    className="data-[state=unchecked]:bg-border"
                  />
                  <Label htmlFor="toggle-past-delete" className="text-sm cursor-pointer">
                    {showPastEventsToDelete ? "Showing Past Events" : "Showing Upcoming Events"}
                  </Label>
                </div>
                <div className="max-h-80 overflow-y-auto space-y-4 pr-2">
                  {showPastEventsToDelete ? (
                    <div>
                      <h4 className="text-md font-semibold mb-2 text-primary">Past Events</h4>
                      {renderEventList(pastEvents, 'delete')}
                    </div>
                  ) : (
                    <div>
                      <h4 className="text-md font-semibold mb-2 text-primary">Upcoming Events</h4>
                      {renderEventList(upcomingEvents, 'delete')}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirm Delete Dialog */}
      {eventToDelete && (
        <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the event "{eventToDelete.title}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsConfirmDeleteDialogOpen(false)} disabled={isDeletingEvent}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteEvent}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isDeletingEvent}
              >
                {isDeletingEvent && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

    
