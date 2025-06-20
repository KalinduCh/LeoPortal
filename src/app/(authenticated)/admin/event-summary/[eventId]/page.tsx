
// src/app/(authenticated)/admin/event-summary/[eventId]/page.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Event, User, AttendanceRecord, EventParticipantSummary } from '@/types';
import { getEvent } from '@/services/eventService';
import { getAttendanceRecordsForEvent } from '@/services/attendanceService';
import { getUserProfile } from '@/services/userService'; 
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// Removed Avatar imports
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, CalendarDays, MapPin, Info, Users, Printer, ArrowLeft } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useReactToPrint } from 'react-to-print';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from "@/components/ui/badge";

export default function EventSummaryPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const eventId = typeof params.eventId === 'string' ? params.eventId : '';

  const [event, setEvent] = useState<Event | null>(null);
  const [participantsSummary, setParticipantsSummary] = useState<EventParticipantSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: event ? `Event Summary - ${event.name}` : 'Event Summary',
  });

  // getInitials is no longer needed here as Avatar is removed from this page
  // const getInitials = (name?: string) => { ... };

  const fetchEventData = useCallback(async () => {
    if (!eventId) {
      setError("Event ID is missing.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const fetchedEvent = await getEvent(eventId);
      if (!fetchedEvent) {
        setError("Event not found.");
        toast({ title: "Error", description: "Could not find the specified event.", variant: "destructive" });
        setEvent(null);
        setIsLoading(false);
        return;
      }
      setEvent(fetchedEvent);

      const attendanceRecords = await getAttendanceRecordsForEvent(eventId);
      const summaries: EventParticipantSummary[] = [];

      for (const record of attendanceRecords) {
        const userProfile = await getUserProfile(record.userId);
        if (userProfile) {
          summaries.push({
            user: userProfile,
            attendanceTimestamp: record.timestamp,
          });
        }
      }
      setParticipantsSummary(summaries);
    } catch (err: any) {
      console.error("Error fetching event summary data:", err);
      setError(`Failed to load event data: ${err.message}`);
      toast({ title: "Error", description: "Could not load event summary details.", variant: "destructive" });
    }
    setIsLoading(false);
  }, [eventId, toast]);

  useEffect(() => {
    fetchEventData();
  }, [fetchEventData]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading event summary...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 text-center">
        <Alert variant="destructive" className="max-w-md mx-auto">
          <AlertTitle>Loading Failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/dashboard')} variant="outline" className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  if (!event) {
    return (
       <div className="container mx-auto py-8 text-center">
        <Alert className="max-w-md mx-auto">
          <AlertTitle>Event Not Found</AlertTitle>
          <AlertDescription>The requested event could not be loaded or does not exist.</AlertDescription>
        </Alert>
         <Button onClick={() => router.push('/dashboard')} variant="outline" className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <Button onClick={() => router.push('/dashboard')} variant="outline" size="sm" className="mb-2 print-hide">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold font-headline text-primary">{event.name} - Summary</h1>
        </div>
        <Button onClick={handlePrint} className="print-hide w-full sm:w-auto">
          <Printer className="mr-2 h-4 w-4" /> Print / Download Summary
        </Button>
      </div>

      <div ref={componentRef} className="p-2 sm:p-6 space-y-6 rounded-lg border bg-card text-card-foreground shadow-sm modal-print-area">
        {/* Event Details Card */}
        <Card className="shadow-none border-0 sm:border sm:shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-primary print-title flex items-center">
                <Info className="mr-2 h-5 w-5" /> Event Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 print-section">
            <div className="flex items-center text-sm">
              <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Date & Time:</span>
              <span className="ml-2">{format(parseISO(event.date), "MMMM d, yyyy 'at' h:mm a")}</span>
            </div>
            <div className="flex items-start text-sm">
              <MapPin className="mr-2 h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <div>
                <span className="font-medium">Location:</span>
                <span className="ml-2 text-muted-foreground">{event.location}</span>
                {event.latitude !== undefined && event.longitude !== undefined && (
                  <p className="text-xs text-muted-foreground/80">
                    (Coordinates: {event.latitude}, {event.longitude})
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-start text-sm">
              <Info className="mr-2 h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
               <div>
                <span className="font-medium">Description:</span>
                <p className="ml-2 text-muted-foreground leading-relaxed whitespace-pre-wrap">{event.description}</p>
               </div>
            </div>
          </CardContent>
        </Card>

        {/* Participants Card */}
        <Card className="shadow-none border-0 sm:border sm:shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-primary print-title flex items-center">
              <Users className="mr-2 h-5 w-5" /> Participants ({participantsSummary.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="print-section">
            {participantsSummary.length > 0 ? (
              <ScrollArea className="max-h-[400px] border rounded-md print-scroll">
                <Table className="print-table">
                  <TableHeader className="print-table-header bg-muted/50">
                    <TableRow>
                      {/* Removed Avatar TableHead */}
                      <TableHead>Name</TableHead>
                      <TableHead>Designation</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="print-table-body">
                    {participantsSummary.map((summary) => (
                      <TableRow key={summary.user.id}>
                        {/* Removed Avatar TableCell */}
                        <TableCell className="font-medium">{summary.user.name}</TableCell>
                        <TableCell className="capitalize text-xs">
                            <Badge variant={summary.user.role === 'admin' ? "default" : "secondary"} className={summary.user.role === 'admin' ? "bg-primary/80" : ""}>
                                {summary.user.role}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{summary.user.email}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(parseISO(summary.attendanceTimestamp), "MMM d, yy, h:mm a")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground italic text-center py-4">No participants recorded for this event.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
