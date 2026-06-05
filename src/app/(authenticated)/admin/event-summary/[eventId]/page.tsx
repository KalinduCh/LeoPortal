
// src/app/(authenticated)/admin/event-summary/[eventId]/page.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Event, User, AttendanceRecord, EventParticipantSummary } from '@/types';
import { getEvent } from '@/services/eventService';
import { getAttendanceRecordsForEvent, markUserAttendance } from '@/services/attendanceService';
import { getUserProfile, getAllUsers } from '@/services/userService'; 
import { useAuth } from '@/hooks/use-auth';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, CalendarDays, MapPin, Info, Users, ArrowLeft, Mail, Star, MessageSquare, ClipboardCopy, FileDown, UserPlus, Search, CheckCircle2, ShieldCheck } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function EventSummaryPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user: currentAdmin } = useAuth();
  const eventId = typeof params.eventId === 'string' ? params.eventId : '';

  const [event, setEvent] = useState<Event | null>(null);
  const [participantsSummary, setParticipantsSummary] = useState<EventParticipantSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Manual marking states
  const [isManualMarkOpen, setIsManualMarkOpen] = useState(false);
  const [allMembers, setAllMembers] = useState<User[]>([]);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [isMarkingInProgress, setIsMarkingInProgress] = useState<string | null>(null);

  const componentRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = () => {
        const input = componentRef.current;
        if (!input || !event) {
            toast({
                title: "Error",
                description: "Could not find content to download.",
                variant: "destructive",
            });
            return;
        }

        toast({ title: "Generating PDF...", description: "Please wait a moment." });

        html2canvas(input, { scale: 2, useCORS: true, logging: false }).then((canvas) => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasWidth / canvasHeight;
            const imgWidth = pdfWidth - 20; // with margin
            let imgHeight = imgWidth / ratio;
            let heightLeft = imgHeight;
            let position = 10; // top margin

            pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
            heightLeft -= (pdf.internal.pageSize.getHeight() - 20);

            while (heightLeft > 0) {
                position = -heightLeft + 10;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
                heightLeft -= (pdf.internal.pageSize.getHeight() - 20);
            }
            pdf.save(`Event_Summary_${event.name.replace(/\s+/g, '_')}.pdf`);
             toast({ title: "PDF Generated", description: "Your summary is downloading." });
        }).catch(err => {
             console.error("Failed to generate PDF:", err);
             toast({ title: "PDF Generation Failed", description: "An error occurred while creating the PDF.", variant: "destructive" });
        });
    };

  const getInitials = (name?: string) => {
    if (!name) return "??";
    const names = name.split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
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
              markedByAdminName: record.markedByAdminName,
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

      // Pre-fetch all members for manual marking if needed
      const allUsers = await getAllUsers();
      setAllMembers(allUsers.filter(u => u.status === 'approved' && ['member', 'admin', 'super_admin'].includes(u.role)));

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
  
  let formattedEventDate = "Date unavailable";
  if (event?.startDate && isValid(parseISO(event.startDate))) {
    const eventStartDateObj = parseISO(event.startDate);
    formattedEventDate = format(eventStartDateObj, "MMMM d, yyyy, h:mm a");
    if (event.endDate && isValid(parseISO(event.endDate))) {
        const eventEndDateObj = parseISO(event.endDate);
        if (eventEndDateObj.toDateString() !== eventStartDateObj.toDateString()) {
             formattedEventDate = `${format(eventStartDateObj, "MMM d, h:mm a")} - ${format(eventEndDateObj, "MMM d, h:mm a")}`;
        } else {
             formattedEventDate = `${format(eventStartDateObj, "MMM d, yyyy, h:mm a")} - ${format(eventEndDateObj, "h:mm a")}`;
        }
    }
  }

  const handleCopySummary = () => {
    if (!event) return;

    const headers = ["Type", "Name", "Role/Designation", "Email/Club", "Comment", "Timestamp", "Marked By"];
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
          timestamp,
          summary.markedByAdminName || "Self"
        ].join('\t');
      } else { // visitor
        return [
          "Visitor",
          summary.visitorName || "",
          summary.visitorDesignation || "",
          summary.visitorClub || "",
          summary.visitorComment || "N/A",
          timestamp,
          "N/A"
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

  const handleManualMark = async (userId: string) => {
    if (!currentAdmin) return;
    setIsMarkingInProgress(userId);
    try {
      const result = await markUserAttendance(
        eventId, 
        userId, 
        undefined, 
        undefined, 
        { id: currentAdmin.id, name: currentAdmin.name }
      );
      if (result.status === 'success' || result.status === 'already_marked') {
        toast({ title: "Attendance Marked", description: result.message });
        await fetchEventData(); // Refresh list
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to mark attendance.", variant: "destructive" });
    }
    setIsMarkingInProgress(null);
  };

  const missingMembers = useMemo(() => {
    const presentIds = new Set(participantsSummary.filter(p => p.type === 'member').map(p => p.id));
    return allMembers.filter(m => !presentIds.has(m.id))
      .filter(m => 
        m.name.toLowerCase().includes(memberSearchTerm.toLowerCase()) || 
        m.email.toLowerCase().includes(memberSearchTerm.toLowerCase())
      );
  }, [allMembers, participantsSummary, memberSearchTerm]);

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
            <Button onClick={() => router.back()} variant="outline" size="sm" className="mb-2 print:hidden">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold font-headline text-primary">{event.name} - Summary</h1>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 print:hidden w-full sm:w-auto">
            <Dialog open={isManualMarkOpen} onOpenChange={setIsManualMarkOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto border-primary text-primary hover:bg-primary/5">
                  <UserPlus className="mr-2 h-4 w-4" /> Manual Mark
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Manual Attendance Marking</DialogTitle>
                  <DialogDescription>Select a member to mark them as present for this event. Your name will be recorded as the authorizing admin.</DialogDescription>
                </DialogHeader>
                <div className="relative my-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search by name or email..." 
                    className="pl-10" 
                    value={memberSearchTerm}
                    onChange={(e) => setMemberSearchTerm(e.target.value)}
                  />
                </div>
                <ScrollArea className="flex-1 overflow-y-auto pr-3">
                  <div className="space-y-3">
                    {missingMembers.length > 0 ? (
                      missingMembers.map(member => (
                        <div key={member.id} className="flex items-center justify-between p-3 border rounded-xl bg-muted/20">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={member.photoUrl} alt={member.name} />
                              <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-bold truncate">{member.name}</p>
                              <p className="text-[10px] text-muted-foreground uppercase">{member.designation || member.role}</p>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-primary font-bold hover:bg-primary/10"
                            onClick={() => handleManualMark(member.id)}
                            disabled={isMarkingInProgress === member.id}
                          >
                            {isMarkingInProgress === member.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>Mark Present</>
                            )}
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-center py-10 text-muted-foreground text-sm italic">
                        {memberSearchTerm ? "No matching members found." : "All club members are already marked present."}
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
            <button onClick={handleCopySummary} className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}>
              <ClipboardCopy className="mr-2 h-4 w-4" /> Copy
            </button>
            <button onClick={handleDownloadPDF} className={cn(buttonVariants({}), "w-full sm:w-auto")}>
              <FileDown className="mr-2 h-4 w-4" /> PDF
            </button>
        </div>
      </div>

      <div ref={componentRef} className="p-2 sm:p-4 md:p-6 space-y-6 rounded-lg border bg-card text-card-foreground shadow-sm print-area">
        <Card className="shadow-none border-0 sm:border sm:shadow-sm print:border-0 print:shadow-none">
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

        <Card className="shadow-none border-0 sm:border sm:shadow-sm print:border-0 print:shadow-none">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl font-semibold text-primary flex items-center">
              <Users className="mr-2 h-5 w-5" /> Participants ({participantsSummary.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {participantsSummary.length > 0 ? (
              <>
                {/* Desktop Table View */}
                <div className="hidden print:block md:block">
                  <ScrollArea className="max-h-[400px] border rounded-md print:max-h-none print:border-0 print:overflow-visible">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="w-12 print:hidden">Avatar/Icon</TableHead>
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
                            <TableCell className="print:hidden">
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
                              {summary.attendanceTimestamp && isValid(parseISO(summary.attendanceTimestamp)) ? (
                                <div>
                                    {format(parseISO(summary.attendanceTimestamp), "MMM d, yy, h:mm a")}
                                    {summary.markedByAdminName && (
                                        <div className="text-[10px] text-orange-600 font-bold flex items-center mt-1">
                                            <ShieldCheck className="h-2.5 w-2.5 mr-1" />
                                            Admin entry: {summary.markedByAdminName}
                                        </div>
                                    )}
                                </div>
                              ) : "Invalid Date"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
                {/* Mobile Card View */}
                <div className="block md:hidden print:hidden">
                  {participantsSummary.map((summary) => (
                    <Card key={summary.id} className="shadow-sm mb-3 last:mb-0">
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
                        <div className="text-xs text-muted-foreground mt-2 text-right">
                          <p>Attended: {summary.attendanceTimestamp && isValid(parseISO(summary.attendanceTimestamp)) ? format(parseISO(summary.attendanceTimestamp), "MMM d, h:mm a") : "Invalid Date"}</p>
                          {summary.markedByAdminName && (
                              <p className="text-[10px] text-orange-600 font-bold italic mt-0.5">Autorized by {summary.markedByAdminName}</p>
                          )}
                        </div>
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
