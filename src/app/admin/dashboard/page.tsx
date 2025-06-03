
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, Edit3, Trash2, LayoutDashboard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function AdminDashboardPage() {
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
        This is where you will manage calendar events. Future enhancements will allow adding, editing, and deleting events directly linked to your Firebase database.
      </CardDescription>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <PlusCircle className="h-5 w-5 text-primary" />
              Add New Event
            </CardTitle>
            <CardDescription>Create a new event for the calendar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">A form for inputting event details (date, title, description, type, image) will appear here.</p>
            <Button className="w-full" disabled>
              Add Event (Coming Soon)
            </Button>
          </CardContent>
        </Card>

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
