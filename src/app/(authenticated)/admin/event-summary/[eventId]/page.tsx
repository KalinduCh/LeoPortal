
// src/app/(authenticated)/admin/event-summary/[eventId]/page.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Event, User, AttendanceRecord, EventParticipantSummary } from '@/types';
import { getEvent } from '@/services/eventService';
import { getAttendanceRecordsForEvent } from '@/services/attendanceService';
import { getUserProfile } from '@/services/userService'; 
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, CalendarDays, MapPin, Info, Users, Printer, ArrowLeft, Mail, UserCircle, Briefcase, Star, MessageSquare, ClipboardCopy } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from '@/lib/utils';

export default function EventSummaryPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const eventId = typeof params.eventId === 'string' ? params.eventId : '';

  const [event, setEvent] = useState<Event | null>(null);
  const [participantsSummary, setParticipantsSummary] = useState<EventParticipantSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getInitials = (name?: string) => {
    if (!name) return "??";
    const names = name.split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  let formattedEventDate = "Date unavailable";
  if (event?.startDate && isValid(parseISO(event.startDate))) {
    const eventStartDateObj = parseISO(event.startDate);
    formattedEventDate = format(eventStartDateObj, "MMMM d, yyyy 'at' h:mm a");
    if (event.endDate && isValid(parseISO(event.endDate))) {
        const eventEndDateObj = parseISO(event.endDate);
        if (eventEndDateObj.toDateString() !== eventStartDateObj.toDateString() || 
            (eventEndDateObj.getHours() !== eventStartDateObj.getHours() || eventEndDateObj.getMinutes() !== eventStartDateObj.getMinutes())) {
             formattedEventDate += ` - ${format(eventEndDateObj, "h:mm a")}`;
        }
    }
  }

  const handleDownloadPDF = () => {
    if (!event) return;
    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.text(event.name, 14, 22);

    // Subtitle
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Event Summary - ${formattedEventDate}`, 14, 30);
    doc.text(`Location: ${event.location}`, 14, 36);

    // Table
    const tableColumn = ["Type", "Name", "Role/Designation", "Email/Club", "Comment", "Timestamp"];
    const tableRows: any[][] = [];

    participantsSummary.forEach(summary => {
      const timestamp = summary.attendanceTimestamp && isValid(parseISO(summary.attendanceTimestamp))
        ? format(parseISO(summary.attendanceTimestamp), "yyyy-MM-dd HH:mm:ss")
        : "Invalid Date";
        
      const row = summary.type === 'member'
        ? ["Member", summary.userName || "", summary.userDesignation || summary.userRole || "Member", summary.userEmail || "", "N/A", timestamp]
        : ["Visitor", summary.visitorName || "", summary.visitorDesignation || "", summary.visitorClub || "", summary.visitorComment || "N/A", timestamp];
      
      tableRows.push(row);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 50,
    });

    doc.save(`Event-Summary-${event.name.replace(/ /g, '_')}.pdf`);
    toast({ title: "PDF Generated", description: "Your event summary is downloading." });
  };

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

      const attendanceRecords: AttendanceRecord[] = await getAttendanceRecordsForEvent(eventId);
      const summaries: EventParticipantSummary[] = [];

      for (const record of attendanceRecords) {
        if (record.attendanceType === 'member' && record.userId) {
          const userProfile = await getUserProfile(record.userId);
          if (userProfile) {
            summaries.push({
              id: userProfile.id,
              attendanceTimestamp: record.timestamp,
              type: 'member',
              userName: userProfile.name,
              userEmail: userProfile.email,
              userRole: userProfile.role,
              userDesignation: userProfile.designation,
              userPhotoUrl: userProfile.photoUrl,
            });
          }
        } else if (record.attendanceType === 'visitor') {
          summaries.push({
            id: record.id, 
            attendanceTimestamp: record.timestamp,
            type: 'visitor',
            visitorName: record.visitorName,
            visitorDesignation: record.visitorDesignation,
            visitorClub: record.visitorClub,
            visitorComment: record.visitorComment,
          });
        }
      }
      // Sort by type (members first), then by name/visitorName
      setParticipantsSummary(summaries.sort((a, b) => {
        if (a.type === 'member' && b.type === 'visitor') return -1;
        if (a.type === 'visitor' && b.type === 'member') return 1;
        const nameA = a.userName || a.visitorName || "";
        const nameB = b.userName || b.visitorName || "";
        return nameA.localeCompare(nameB);
      }));
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
  
  const handleCopySummary = () => {
    if (!event) return;

    const headers = ["Type", "Name", "Role/Designation", "Email/Club", "Comment", "Timestamp"];
    const rows = participantsSummary.map(summary => {
      const timestamp = summary.attendanceTimestamp && isValid(parseISO(summary.attendanceTimestamp))
        ? format(parseISO(summary.attendanceTimestamp), "yyyy-MM-dd HH:mm:ss")
        : "Invalid Date";
        
      if (summary.type === 'member') {
        return [
          "Member",
          summary.userName || "",
          summary.userDesignation || summary.userRole || "Member",
          summary.userEmail || "",
          "N/A",
          timestamp
        ].join('\t');
      } else { // visitor
        return [
          "Visitor",
          summary.visitorName || "",
          summary.visitorDesignation || "",
          summary.visitorClub || "",
          summary.visitorComment || "N/A",
          timestamp
        ].join('\t');
      }
    });

    const summaryText = [
      `Event Summary: ${event.name}`,
      `Date & Time: ${formattedEventDate}`,
      `Location: ${event.location}`,
      `Description: ${event.description}`,
      '', // blank line
      '--- Participants ---',
      headers.join('\t'),
      ...rows
    ].join('\n');

    navigator.clipboard.writeText(summaryText).then(() => {
      toast({
        title: "Summary Copied!",
        description: "The event summary has been copied to your clipboard.",
      });
    }).catch(err => {
      console.error("Failed to copy summary: ", err);
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard. Check browser permissions.",
        variant: "destructive",
      });
    });
  };


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
      <div className="container mx-auto py-4 sm:py-8 text-center">
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
       <div className="container mx-auto py-4 sm:py-8 text-center">
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
    <div className="container mx-auto py-4 sm:py-8 space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <Button onClick={() => router.back()} variant="outline" size="sm" className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold font-headline text-primary">{event.name} - Summary</h1>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button onClick={handleCopySummary} className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}>
              <ClipboardCopy className="mr-2 h-4 w-4" /> Copy Summary
            </button>
            <button onClick={handleDownloadPDF} className={cn(buttonVariants({}), "w-full sm:w-auto")}>
              <Printer className="mr-2 h-4 w-4" /> Download PDF
            </button>
        </div>
      </div>

      <div className="p-2 sm:p-4 md:p-6 space-y-6 rounded-lg border bg-card text-card-foreground shadow-sm">
        <Card className="shadow-none border-0 sm:border sm:shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl font-semibold text-primary flex items-center">
                <Info className="mr-2 h-5 w-5" /> Event Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3">
            <div className="flex items-center text-sm">
              <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Date & Time:</span>
              <span className="ml-2">{formattedEventDate}</span>
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

        <Card className="shadow-none border-0 sm:border sm:shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl font-semibold text-primary flex items-center">
              <Users className="mr-2 h-5 w-5" /> Participants ({participantsSummary.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[500px] overflow-y-auto">
            {participantsSummary.length > 0 ? (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader className="bg-muted/50 sticky top-0">
                      <TableRow>
                        <TableHead className="w-12">Avatar/Icon</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Role/Designation</TableHead>
                        <TableHead>Email/Club</TableHead>
                        <TableHead>Comment</TableHead>
                        <TableHead>Timestamp</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {participantsSummary.map((summary) => (
                        <TableRow key={summary.id}>
                          <TableCell>
                             {summary.type === 'member' ? (
                               <Avatar className="h-9 w-9">
                                <AvatarImage src={summary.userPhotoUrl} alt={summary.userName} data-ai-hint="profile avatar" />
                                <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                                    {getInitials(summary.userName)}
                                </AvatarFallback>
                              </Avatar>
                             ) : (
                              <Star className="h-7 w-7 text-yellow-500" /> 
                             )}
                          </TableCell>
                          <TableCell className="font-medium">{summary.userName || summary.visitorName}</TableCell>
                          <TableCell className="capitalize text-xs">
                              <Badge variant={summary.type === 'member' ? (summary.userRole === 'admin' ? "default" : "secondary") : "outline"} className={summary.type === 'member' && summary.userRole === 'admin' ? "bg-primary/80" : (summary.type === 'visitor' ? "border-yellow-500 text-yellow-600" : "") }>
                                  {summary.userDesignation || summary.userRole || summary.visitorDesignation || 'Visitor'}
                              </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                              {summary.userEmail || summary.visitorClub}
                          </TableCell>
                           <TableCell className="text-xs text-muted-foreground italic">
                              {summary.type === 'visitor' ? (summary.visitorComment || 'N/A') : 'N/A'}
                           </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {summary.attendanceTimestamp && isValid(parseISO(summary.attendanceTimestamp)) ? format(parseISO(summary.attendanceTimestamp), "MMM d, yy, h:mm a") : "Invalid Date"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {/* Mobile Card View */}
                <div className="block md:hidden space-y-3">
                  {participantsSummary.map((summary) => (
                    <Card key={summary.id} className="shadow-sm">
                      <CardContent className="p-3">
                        <div className="flex items-start space-x-3">
                            {summary.type === 'member' ? (
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={summary.userPhotoUrl} alt={summary.userName} data-ai-hint="profile avatar" />
                                    <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                                        {getInitials(summary.userName)}
                                    </AvatarFallback>
                                </Avatar>
                            ) : (
                                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-yellow-100">
                                 <Star className="h-6 w-6 text-yellow-500" />
                                </div>
                            )}
                            <div className="flex-grow min-w-0">
                                <p className="font-semibold text-primary truncate">{summary.userName || summary.visitorName}</p>
                                {summary.type === 'member' && summary.userEmail && (
                                     <p className="text-xs text-muted-foreground truncate flex items-center">
                                        <Mail className="h-3 w-3 mr-1"/> {summary.userEmail}
                                    </p>
                                )}
                                {summary.type === 'visitor' && summary.visitorClub && (
                                     <p className="text-xs text-muted-foreground truncate flex items-center">
                                        <Users className="h-3 w-3 mr-1"/> {summary.visitorClub}
                                    </p>
                                )}
                                <div className="mt-1">
                                    <Badge 
                                      variant={summary.type === 'member' ? (summary.userRole === 'admin' ? 'default' : 'secondary') : 'outline'} 
                                      className={`text-xs capitalize ${summary.type === 'member' && summary.userRole === 'admin' ? 'bg-primary/80' : (summary.type === 'visitor' ? 'border-yellow-500 text-yellow-600' : '')}`}
                                    >
                                        {summary.userDesignation || summary.userRole || summary.visitorDesignation || 'Visitor'}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                        {summary.type === 'visitor' && summary.visitorComment && (
                            <p className="text-xs text-muted-foreground mt-2 italic flex items-start">
                               <MessageSquare className="h-3 w-3 mr-1.5 mt-0.5 shrink-0" /> {summary.visitorComment}
                            </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2 text-right">
                          Attended: {summary.attendanceTimestamp && isValid(parseISO(summary.attendanceTimestamp)) ? format(parseISO(summary.attendanceTimestamp), "MMM d, h:mm a") : "Invalid Date"}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic text-center py-4">No participants recorded for this event.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
