
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, Edit3, Trash2, LayoutDashboard, Calendar as CalendarIcon, Image as ImageIcon, Type, FileText, ListChecks, AlertTriangle } from 'lucide-react';
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
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db, firebaseInitializationError } from '@/lib/firebase';
import { collection, addDoc, Timestamp, getDocs, deleteDoc, doc, onSnapshot, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { useToast } from '@/hooks/use-toast';
import React, { useState, useTransition, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const eventFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  date: z.date({ required_error: "Date is required." }),
  endDate: z.date().optional(),
  type: z.string().optional(),
  imageUrl: z.string().url("Invalid URL, ensure it's a full URL.").optional().or(z.literal('')),
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

interface EventItem {
  id: string;
  title: string;
  date: Date;
}

const bcmImageUrls = [
  { name: "None", value: "" },
  { name: "BCM Rahsiveng", value: "https://drive.google.com/uc?export=download&id=1krFnm-8fErnJnM5dPKX85lQHHmgzyPms" },
  { name: "BCM Moria", value: "https://drive.google.com/uc?export=download&id=1XYASWYTbjAx26o5rQl-6oB525C0dRH6f" },
  { name: "BCM Venghlun", value: "https://drive.google.com/uc?export=download&id=1XCf90Hbx0gexMJfWk1RVzcMIYkKg4L2b" },
  { name: "BCM Bethel", value: "https://drive.google.com/uc?export=download&id=1KUneQwWamPFyJSHUbr-xVADfeDN80oO_" },
  { name: "BCM Sazaikawn", value: "https://drive.google.com/uc?export=download&id=1VlXtBN7CUT4JfcYOHR-p-RNRcj6BKvH_" },
];

export default function AdminDashboardPage() {
  const [isAddEventDialogOpen, setIsAddEventDialogOpen] = useState(false);
  const [isAddEventSubmitting, startAddEventTransition] = useTransition();
  const { toast } = useToast();

  const [allEventsForDeletion, setAllEventsForDeletion] = useState<EventItem[]>([]);
  const [isLoadingDeleteList, setIsLoadingDeleteList] = useState(true);
  const [deleteListError, setDeleteListError] = useState<string | null>(null);
  const [eventToDelete, setEventToDelete] = useState<EventItem | null>(null);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [isDeletingEvent, startDeleteEventTransition] = useTransition();


  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      date: undefined,
      endDate: undefined,
      type: "", 
      imageUrl: "",
    },
  });

  const onAddEventSubmit = async (data: EventFormValues) => {
    if (firebaseInitializationError || !db) {
      toast({
        title: "Error",
        description: `Firebase is not configured correctly: ${firebaseInitializationError || "Firestore unavailable."}`,
        variant: "destructive",
      });
      return;
    }

    startAddEventTransition(async () => {
      try {
        const eventData: any = {
          title: data.title,
          description: data.description,
          date: Timestamp.fromDate(data.date),
        };
        if (data.endDate) {
          eventData.endDate = Timestamp.fromDate(data.endDate);
        }
        if (data.type && data.type !== "--") { 
          eventData.type = data.type;
        }
        if (data.imageUrl && data.imageUrl.trim() !== "") {
          eventData.imageUrl = data.imageUrl;
        }

        await addDoc(collection(db, "calendarEvents"), eventData);

        toast({
          title: "Success!",
          description: "Event added successfully.",
        });
        form.reset();
        setIsAddEventDialogOpen(false);
      } catch (error) {
        console.error("Error adding event to Firestore:", error);
        toast({
          title: "Error",
          description: "Failed to add event. Please check console for details.",
          variant: "destructive",
        });
      }
    });
  };

  useEffect(() => {
    if (firebaseInitializationError || !db) {
      setDeleteListError(`Firebase is not configured: ${firebaseInitializationError || "Firestore unavailable."}`);
      setIsLoadingDeleteList(false);
      return;
    }

    setIsLoadingDeleteList(true);
    const eventsCollectionRef = collection(db, "calendarEvents");
    const unsubscribe = onSnapshot(eventsCollectionRef, (snapshot) => {
      const fetchedEvents: EventItem[] = snapshot.docs.map((docSnap: QueryDocumentSnapshot<DocumentData>) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: data.title || "Untitled Event",
          date: data.date instanceof Timestamp ? data.date.toDate() : new Date(),
        };
      });
      setAllEventsForDeletion(fetchedEvents.sort((a, b) => b.date.getTime() - a.date.getTime())); // Sort by date descending
      setIsLoadingDeleteList(false);
      setDeleteListError(null);
    }, (error) => {
      console.error("Error fetching events for deletion list:", error);
      setDeleteListError("Failed to load events for deletion. Please check console.");
      setIsLoadingDeleteList(false);
    });

    return () => unsubscribe();
  }, [db, firebaseInitializationError]);

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
        setAllEventsForDeletion(prevEvents => prevEvents.filter(e => e.id !== eventToDelete.id));
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
        <Dialog open={isAddEventDialogOpen} onOpenChange={setIsAddEventDialogOpen}>
          <DialogTrigger asChild>
            <Card className="shadow-md hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <PlusCircle className="h-5 w-5 text-primary" />
                  Add New Event
                </CardTitle>
                <CardDescription>Create a new event for the calendar.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Click here to open the form for inputting event details (date, title, description, etc.).</p>
                <Button className="w-full">
                  Add Event
                </Button>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Event</DialogTitle>
              <DialogDescription>
                Fill in the details below to add a new event to the calendar.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onAddEventSubmit)} className="space-y-4 py-2">
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
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <SelectTrigger id="type">
                        <SelectValue placeholder="Select event type (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="--">Default</SelectItem> 
                        <SelectItem value="event1">Rawngbawlna</SelectItem>
                        <SelectItem value="event2">Hla Zir</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.type && <p className="text-xs text-destructive mt-1">{form.formState.errors.type.message}</p>}
              </div>
              <div>
                <Label htmlFor="imageUrl" className="flex items-center gap-1 mb-1"><ImageIcon className="h-4 w-4" />Image URL (Optional)</Label>
                <Controller
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || ""}>
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
                  <Button type="button" variant="outline" disabled={isAddEventSubmitting}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isAddEventSubmitting}>
                  {isAddEventSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Event
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Edit3 className="h-5 w-5 text-primary" />
              Modify Existing Events
            </CardTitle>
            <CardDescription>Edit or update current calendar events.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">A list of existing events with options to edit each one will be displayed here.</p>
             <Button className="w-full" disabled>
              View/Edit Events (Coming Soon)
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Events
            </CardTitle>
            <CardDescription>Remove events from the calendar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingDeleteList ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
                <span className="text-muted-foreground">Loading events...</span>
              </div>
            ) : deleteListError ? (
              <div className="text-destructive p-3 bg-destructive/10 border border-destructive rounded-md">
                <div className="flex items-center">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  <span className="font-medium text-sm">Error</span>
                </div>
                <p className="text-xs mt-1">{deleteListError}</p>
              </div>
            ) : allEventsForDeletion.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No events available to delete.</p>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                {allEventsForDeletion.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium text-sm text-foreground">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{format(event.date, "PPP")}</p>
                    </div>
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
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
