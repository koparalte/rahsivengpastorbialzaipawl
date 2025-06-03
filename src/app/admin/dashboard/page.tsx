
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, Edit3, Trash2, LayoutDashboard, Calendar as CalendarIcon, Image as ImageIcon, Type, FileText } from 'lucide-react';
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db, firebaseInitializationError } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { useToast } from '@/hooks/use-toast';
import React, { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';

const eventFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  date: z.date({ required_error: "Date is required." }),
  endDate: z.date().optional(),
  type: z.string().optional(),
  imageUrl: z.string().url("Invalid URL").optional().or(z.literal('')),
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

export default function AdminDashboardPage() {
  const [isAddEventDialogOpen, setIsAddEventDialogOpen] = useState(false);
  const [isSubmitting, startTransition] = useTransition();
  const { toast } = useToast();

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

  const onSubmit = async (data: EventFormValues) => {
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
          date: Timestamp.fromDate(data.date),
        };
        if (data.endDate) {
          eventData.endDate = Timestamp.fromDate(data.endDate);
        }
        if (data.type && data.type !== "default") {
          eventData.type = data.type;
        }
        if (data.imageUrl) {
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger id="type">
                        <SelectValue placeholder="Select event type (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Default</SelectItem>
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
                <Input id="imageUrl" {...form.register("imageUrl")} placeholder="https://example.com/image.png" />
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
            <p className="text-sm text-muted-foreground">A list of existing events with options to delete each one will be displayed here.</p>
            <Button variant="destructive" className="w-full" disabled>
              Delete Event (Coming Soon)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

