
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
import { Loader2, CalendarDays, MapPin, Info, Users, ArrowLeft, Mail, Star, MessageSquare, ClipboardCopy, FileDown, UserPlus, Search, CheckCircle2, ShieldCheck, FileSpreadsheet } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import Papa from 'papaparse';

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

  const handleExportCSV = () => {
    if (!event) return;

    const exportData = participantsSummary.map(summary => {
      const timestamp = summary.attendanceTimestamp && isValid(parseISO(summary.attendanceTimestamp))
        ? format(parseISO(summary.attendanceTimestamp), "yyyy-MM-dd HH:mm:ss")
        : "Invalid Date";
        
      if (summary.type === 'member') {
        return {
          "Type": "Member",
          "Name": summary.userName || "",
          "Designation": summary.userDesignation || summary.userRole || "Member",
          "Email/Club": summary.userEmail || "",
          "Comment": "N/A",
          "Marked By": summary.markedByAdminName || "Self-Checkin",
          "Timestamp": timestamp
        };
      } else { // visitor
        return {
          "Type": "Visitor",
          "Name": summary.visitorName || "",
          "Designation": summary.visitorDesignation || "",
          "Email/Club": summary.visitorClub || "",
          "Comment": summary.visitorComment || "",
          "Marked By": "N/A",
          "Timestamp": timestamp
        };
      }
    });

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Event_Participants_${event.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Started", description: "Your CSV file is being downloaded." });
  };

  const handleCopySummary = () => {
    if (!event) return;

    const headers = ["Type", "Name", "Designation", "Email/Club", "Marked By", "Timestamp"];
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
          summary.markedByAdminName || "Self",
          timestamp
        ].join('\t');
      } else { // visitor
        return [
          "Visitor",
          summary.visitorName || "",
          summary.visitorDesignation || "",
          summary.visitorClub || "",
          "N/A",
          timestamp
        ].join('\t');
      }
    });

    const summaryText = [
      `Event Summary: ${event.name}`,
      `Date & Time: ${formattedEventDate}`,
      `Location: ${event.location}`,
      '',
      '--- Participants ---',
      headers.join('\t'),
      ...rows
    ].join('\n');

    navigator.clipboard.writeText(summaryText).then(() => {
      toast({ title: "Summary Copied!", description: "Participant list copied to clipboard." });
    }).catch(err => {
      toast({ title: "Copy Failed", description: "Check browser permissions.", variant: "destructive" });
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

  if (!event) return null;
  
  return (
    <div className="container mx-auto py-4 sm:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <Button onClick={() => router.back()} variant="outline" size="sm" className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold font-headline text-primary">{event.name}</h1>
            <p className="text-muted-foreground text-sm">Post-Event Participant Analytics</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Dialog open={isManualMarkOpen} onOpenChange={setIsManualMarkOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto border-primary text-primary hover:bg-primary/5">
                  <UserPlus className="mr-2 h-4 w-4" /> Manual Mark
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Manual Entry</DialogTitle>
                  <DialogDescription>Mark missing members as present.</DialogDescription>
                </DialogHeader>
                <div className="relative my-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search name..." 
                    className="pl-10" 
                    value={memberSearchTerm}
                    onChange={(e) => setMemberSearchTerm(e.target.value)}
                  />
                </div>
                <ScrollArea className="flex-1 min-h-[300px] border rounded-lg p-2">
                  <div className="space-y-2">
                    {missingMembers.length > 0 ? (
                      missingMembers.map(member => (
                        <div key={member.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={member.photoUrl} alt={member.name} />
                              <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate">{member.name}</p>
                              <p className="text-[10px] text-muted-foreground uppercase">{member.designation || member.role}</p>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-primary font-bold h-8 text-[10px]"
                            onClick={() => handleManualMark(member.id)}
                            disabled={isMarkingInProgress === member.id}
                          >
                            {isMarkingInProgress === member.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Mark Present"}
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-center py-10 text-muted-foreground text-xs italic">No missing members found.</p>
                    )}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
            <Button onClick={handleCopySummary} variant="outline" className="w-full sm:w-auto">
              <ClipboardCopy className="mr-2 h-4 w-4" /> Copy List
            </Button>
            <Button onClick={handleExportCSV} className="w-full sm:w-auto bg-green-600 hover:bg-green-700">
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Export CSV / Excel
            </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-primary flex items-center">
                <Info className="mr-2 h-5 w-5" /> Event Logistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Schedule</p>
              <p className="text-sm font-medium">{formattedEventDate}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Venue</p>
              <p className="text-sm font-medium">{event.location}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Total Present</p>
              <div className="flex items-center gap-2">
                 <span className="text-3xl font-black text-primary">{participantsSummary.length}</span>
                 <Badge variant="secondary">Attendance Rate: {Math.round((participantsSummary.filter(p => p.type === 'member').length / (allMembers.length || 1)) * 100)}%</Badge>
              </div>
            </div>
            <Separator />
            <p className="text-xs text-muted-foreground italic leading-relaxed">{event.description}</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-primary flex items-center justify-between">
              <div className="flex items-center">
                <Users className="mr-2 h-5 w-5" /> Registered Attendees
              </div>
              <Badge variant="outline">{participantsSummary.length} Records</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {participantsSummary.length > 0 ? (
              <>
                {/* Desktop Table with improved scrolling */}
                <div className="hidden md:block">
                  <div className="border-t border-b overflow-hidden">
                    <div className="max-h-[500px] overflow-y-auto">
                      <Table>
                        <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
                          <TableRow>
                            <TableHead className="w-12"></TableHead>
                            <TableHead>Attendee</TableHead>
                            <TableHead>Email / Club</TableHead>
                            <TableHead>Authorized By</TableHead>
                            <TableHead className="text-right">Time</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {participantsSummary.map((summary) => (
                            <TableRow key={summary.id} className="hover:bg-muted/30 transition-colors">
                              <TableCell>
                                {summary.type === 'member' ? (
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={summary.userPhotoUrl} alt={summary.userName} />
                                    <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-bold">{getInitials(summary.userName)}</AvatarFallback>
                                  </Avatar>
                                ) : (
                                  <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" /> 
                                )}
                              </TableCell>
                              <TableCell>
                                <p className="font-bold text-sm leading-none">{summary.userName || summary.visitorName}</p>
                                <p className="text-[10px] text-muted-foreground uppercase mt-1 tracking-tighter">
                                  {summary.userDesignation || summary.visitorDesignation || 'Guest'}
                                </p>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {summary.userEmail || summary.visitorClub}
                              </TableCell>
                              <TableCell>
                                {summary.markedByAdminName ? (
                                    <div className="flex items-center gap-1.5 text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-1 rounded-full border border-orange-100">
                                        <ShieldCheck className="h-3 w-3" /> {summary.markedByAdminName}
                                    </div>
                                ) : (
                                    <div className="text-[10px] text-muted-foreground italic">Self-Checkin</div>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-mono text-[10px] text-muted-foreground">
                                {summary.attendanceTimestamp && isValid(parseISO(summary.attendanceTimestamp)) ? format(parseISO(summary.attendanceTimestamp), "h:mm a") : "--:--"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>

                {/* Mobile View with clean scrolling cards */}
                <div className="block md:hidden">
                    <ScrollArea className="h-[400px]">
                        <div className="p-4 space-y-3">
                            {participantsSummary.map((summary) => (
                                <div key={summary.id} className="p-3 border rounded-2xl bg-white shadow-sm space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {summary.type === 'member' ? (
                                                <Avatar className="h-9 w-9">
                                                    <AvatarImage src={summary.userPhotoUrl} />
                                                    <AvatarFallback>{getInitials(summary.userName)}</AvatarFallback>
                                                </Avatar>
                                            ) : (
                                                <div className="h-9 w-9 rounded-full bg-yellow-50 flex items-center justify-center"><Star className="h-5 w-5 text-yellow-500" /></div>
                                            )}
                                            <div>
                                                <p className="font-bold text-sm leading-tight">{summary.userName || summary.visitorName}</p>
                                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{summary.userDesignation || 'Visitor'}</p>
                                            </div>
                                        </div>
                                        <p className="text-[10px] font-bold text-muted-foreground">
                                            {summary.attendanceTimestamp && isValid(parseISO(summary.attendanceTimestamp)) ? format(parseISO(summary.attendanceTimestamp), "h:mm a") : ""}
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t text-[10px]">
                                        <p className="text-muted-foreground truncate max-w-[150px]">{summary.userEmail || summary.visitorClub}</p>
                                        {summary.markedByAdminName && (
                                            <div className="flex items-center gap-1 font-black text-orange-600">
                                                <ShieldCheck className="h-2.5 w-2.5" /> {summary.markedByAdminName}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
              </>
            ) : (
              <div className="text-center py-20 bg-muted/10">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground italic">No participants recorded yet.</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-slate-50 p-4 border-t rounded-b-lg">
             <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold mx-auto">Secured LeoPortal Audit Trail</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
