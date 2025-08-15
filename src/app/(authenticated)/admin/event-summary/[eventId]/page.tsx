
// src/app/(authenticated)/admin/event-summary/[eventId]/page.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Event, User, AttendanceRecord, EventParticipantSummary, BudgetItem } from '@/types';
import { getEvent, updateEvent } from '@/services/eventService';
import { getAttendanceRecordsForEvent } from '@/services/attendanceService';
import { getUserProfile } from '@/services/userService'; 
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, CalendarDays, MapPin, Info, Users, Download, ArrowLeft, Mail, Star, MessageSquare, ClipboardCopy, DollarSign, PlusCircle, Trash2 } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

const BudgetTable = ({ title, items, onAddItem, onRemoveItem, onUpdateItem, isEditable }: { title: string, items: BudgetItem[], onAddItem?: () => void, onRemoveItem?: (index: number) => void, onUpdateItem?: (index: number, field: 'item' | 'amount', value: any) => void, isEditable?: boolean }) => {
    const total = items.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    return (
        <div>
            <h4 className="font-semibold mb-2">{title}</h4>
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead className="text-right">Amount (LKR)</TableHead>
                            {isEditable && <TableHead className="w-12"></TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((item, index) => (
                            <TableRow key={index}>
                                <TableCell>
                                    {isEditable ? (
                                        <Input value={item.item} onChange={(e) => onUpdateItem?.(index, 'item', e.target.value)} />
                                    ) : (
                                        item.item
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    {isEditable ? (
                                        <Input type="number" value={item.amount} className="text-right" onChange={(e) => onUpdateItem?.(index, 'amount', e.target.value)} />
                                    ) : (
                                        Number(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                    )}
                                </TableCell>
                                 {isEditable && (
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => onRemoveItem?.(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                         {items.length === 0 && !isEditable && (
                            <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">No items budgeted.</TableCell></TableRow>
                        )}
                    </TableBody>
                    <TableFooter>
                        <TableRow className="bg-muted/50 font-bold">
                            <TableCell>Total</TableCell>
                            <TableCell className="text-right">{total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                            {isEditable && <TableCell></TableCell>}
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
            {isEditable && <Button size="sm" variant="outline" className="mt-2" onClick={onAddItem}><PlusCircle className="mr-2 h-4 w-4" /> Add Item</Button>}
        </div>
    );
};


export default function EventSummaryPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const eventId = typeof params.eventId === 'string' ? params.eventId : '';

  const [event, setEvent] = useState<Event | null>(null);
  const [participantsSummary, setParticipantsSummary] = useState<EventParticipantSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetState, setBudgetState] = useState(event?.budget);
  const [isSavingBudget, setIsSavingBudget] = useState(false);


  const componentRef = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = () => {
    if (!componentRef.current || !event) {
      toast({ title: "Error", description: "Cannot generate PDF. Report content not found.", variant: "destructive"});
      return;
    }
    
    const input = componentRef.current;
    const pdfFileName = `Event-Summary-${event.name.replace(/ /g, '_')}.pdf`;

    const elementsToHide = Array.from(input.querySelectorAll('.print-hide')) as HTMLElement[];
    const scrollArea = input.querySelector('.print-scroll') as HTMLElement;
    const mobileView = input.querySelector('.participant-mobile-view') as HTMLElement;
    const desktopView = input.querySelector('.participant-desktop-view') as HTMLElement;
    
    const originalStyles: {el: HTMLElement, display: string}[] = [];
    const originalScrollStyles = {
      maxHeight: scrollArea?.style.maxHeight,
      overflowY: scrollArea?.style.overflowY,
      border: scrollArea?.style.border,
    };
    
    const saveAndSetStyle = (el: HTMLElement | null, display: string) => {
        if(el) {
            originalStyles.push({el, display: el.style.display});
            el.style.display = display;
        }
    };
    
    elementsToHide.forEach(el => saveAndSetStyle(el, 'none'));
    saveAndSetStyle(mobileView, 'none');
    saveAndSetStyle(desktopView, 'block');

    if (scrollArea) {
      scrollArea.style.maxHeight = 'none';
      scrollArea.style.overflowY = 'visible';
      scrollArea.style.border = 'none';
    }

    html2canvas(input, { scale: 2, useCORS: true, logging: false })
    .then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = canvasWidth / canvasHeight;
      let imgWidth = pdfWidth - 20; // 10mm margin
      let imgHeight = imgWidth / ratio;
      let heightLeft = imgHeight;
      let position = 10; // Top margin

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= (pdf.internal.pageSize.getHeight() - 20);

      while (heightLeft > 0) {
        position = -heightLeft + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= (pdf.internal.pageSize.getHeight() - 20);
      }
      pdf.save(pdfFileName);
      toast({ title: "PDF Generated", description: "Your report is downloading." });
    })
    .catch(err => {
      console.error("Could not generate PDF: ", err);
      toast({ title: "PDF Generation Failed", variant: "destructive" });
    })
    .finally(() => {
        originalStyles.forEach(s => s.el.style.display = s.display);
        if (scrollArea) {
          scrollArea.style.maxHeight = originalScrollStyles.maxHeight || '';
          scrollArea.style.overflowY = originalScrollStyles.overflowY || '';
          scrollArea.style.border = originalScrollStyles.border || '';
        }
    });
  };

  const handleDownloadCsv = () => {
    if (!event) return;

    const csvData = participantsSummary.map(summary => {
      const timestamp = summary.attendanceTimestamp && isValid(parseISO(summary.attendanceTimestamp))
        ? format(parseISO(summary.attendanceTimestamp), "yyyy-MM-dd HH:mm:ss") : "Invalid Date";
      if (summary.type === 'member') {
        return {
          Type: "Member",
          Name: summary.userName || "",
          "Role/Designation": summary.userDesignation || summary.userRole || "Member",
          "Email/Club": summary.userEmail || "",
          Comment: "N/A",
          Timestamp: timestamp,
        };
      } else { // visitor
        return {
          Type: "Visitor",
          Name: summary.visitorName || "",
          "Role/Designation": summary.visitorDesignation || "",
          "Email/Club": summary.visitorClub || "",
          Comment: summary.visitorComment || "N/A",
          Timestamp: timestamp,
        };
      }
    });

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `Event-Participants-${event.name.replace(/ /g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "CSV Generated", description: "Your participant list is downloading." });
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
      setBudgetState(fetchedEvent.budget);

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

  const handleCopySummary = () => {
    if (!event) return;
    const headers = ["Type", "Name", "Role/Designation", "Email/Club", "Comment", "Timestamp"];
    const rows = participantsSummary.map(summary => {
      const timestamp = summary.attendanceTimestamp && isValid(parseISO(summary.attendanceTimestamp))
        ? format(parseISO(summary.attendanceTimestamp), "yyyy-MM-dd HH:mm:ss")
        : "Invalid Date";
      if (summary.type === 'member') {
        return [ "Member", summary.userName || "", summary.userDesignation || summary.userRole || "Member", summary.userEmail || "", "N/A", timestamp ].join('\t');
      } else {
        return [ "Visitor", summary.visitorName || "", summary.visitorDesignation || "", summary.visitorClub || "", summary.visitorComment || "N/A", timestamp ].join('\t');
      }
    });
    const summaryText = [ `Event Summary: ${event.name}`, `Date & Time: ${formattedEventDate}`, `Location: ${event.location}`, `Description: ${event.description}`, '', '--- Participants ---', headers.join('\t'), ...rows ].join('\n');
    navigator.clipboard.writeText(summaryText).then(() => {
      toast({ title: "Summary Copied!", description: "The event summary has been copied to your clipboard." });
    }).catch(err => {
      console.error("Failed to copy summary: ", err);
      toast({ title: "Copy Failed", description: "Could not copy to clipboard. Check browser permissions.", variant: "destructive" });
    });
  };

  const handleUpdateBudgetItem = (type: 'actualIncome' | 'actualExpenses', index: number, field: 'item' | 'amount', value: any) => {
    setBudgetState(prev => {
        if (!prev) return prev;
        const newBudget = { ...prev };
        const newItems = [...(newBudget[type] || [])];
        newItems[index] = { ...newItems[index], [field]: value };
        newBudget[type] = newItems;
        return newBudget;
    });
  };

  const handleAddBudgetItem = (type: 'actualIncome' | 'actualExpenses') => {
      setBudgetState(prev => {
          const newBudget = prev ? { ...prev } : { estimatedIncome: [], estimatedExpenses: [], actualIncome: [], actualExpenses: [] };
          const newItems = [...(newBudget[type] || [])];
          newItems.push({ item: '', amount: 0 });
          newBudget[type] = newItems;
          return newBudget;
      });
  };

  const handleRemoveBudgetItem = (type: 'actualIncome' | 'actualExpenses', index: number) => {
      setBudgetState(prev => {
          if (!prev) return prev;
          const newBudget = { ...prev };
          const newItems = [...(newBudget[type] || [])];
          newItems.splice(index, 1);
          newBudget[type] = newItems;
          return newBudget;
      });
  };

  const handleSaveBudget = async () => {
      if (!event || !budgetState) return;
      setIsSavingBudget(true);
      try {
          const updatedEventData = { ...event, budget: budgetState };
          // This service call needs to be created or adapted
          await updateEvent(event.id, updatedEventData as any); // Casting because updateEvent expects form values
          setEvent(updatedEventData);
          setIsEditingBudget(false);
          toast({ title: 'Budget Updated', description: 'Actual income and expenses have been saved.' });
      } catch (error: any) {
          toast({ title: 'Save Failed', description: `Could not save budget: ${error.message}`, variant: 'destructive' });
      } finally {
          setIsSavingBudget(false);
      }
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
            <Button onClick={() => router.back()} variant="outline" size="sm" className="mb-2 print-hide">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold font-headline text-primary">{event.name} - Summary</h1>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto print-hide">
            <button onClick={handleCopySummary} className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}>
              <ClipboardCopy className="mr-2 h-4 w-4" /> Copy Summary
            </button>
            <button onClick={handleDownloadCsv} className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}>
              <Download className="mr-2 h-4 w-4" /> Download CSV
            </button>
            <button onClick={handleDownloadPdf} className={cn(buttonVariants({}), "w-full sm:w-auto")}>
              <Download className="mr-2 h-4 w-4" /> Download PDF
            </button>
        </div>
      </div>

      <div ref={componentRef} className="p-2 sm:p-4 md:p-6 space-y-6 rounded-lg border bg-card text-card-foreground shadow-sm">
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

        {event.budget && (
           <Card className="shadow-none border-0 sm:border sm:shadow-sm">
              <CardHeader>
                <div className="flex justify-between items-center print-hide">
                    <CardTitle className="text-lg sm:text-xl font-semibold text-primary flex items-center">
                        <DollarSign className="mr-2 h-5 w-5" /> Event Budget & Financials
                    </CardTitle>
                    {isEditingBudget ? (
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => { setIsEditingBudget(false); setBudgetState(event.budget); }}>Cancel</Button>
                            <Button size="sm" onClick={handleSaveBudget} disabled={isSavingBudget}>
                                {isSavingBudget && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Save Actuals
                            </Button>
                        </div>
                    ) : (
                        <Button variant="outline" size="sm" onClick={() => setIsEditingBudget(true)}>Edit Actuals</Button>
                    )}
                </div>
                 <div className="hidden print-show text-lg sm:text-xl font-semibold text-primary">Event Budget & Financials</div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
                 <BudgetTable title="Estimated Income" items={event.budget.estimatedIncome || []} />
                 <BudgetTable title="Estimated Expenses" items={event.budget.estimatedExpenses || []} />
                 <BudgetTable 
                    title="Actual Income" 
                    items={budgetState?.actualIncome || []}
                    isEditable={isEditingBudget}
                    onAddItem={() => handleAddBudgetItem('actualIncome')}
                    onRemoveItem={(index) => handleRemoveBudgetItem('actualIncome', index)}
                    onUpdateItem={(index, field, value) => handleUpdateBudgetItem('actualIncome', index, field, value)}
                 />
                 <BudgetTable
                    title="Actual Expenses"
                    items={budgetState?.actualExpenses || []}
                    isEditable={isEditingBudget}
                    onAddItem={() => handleAddBudgetItem('actualExpenses')}
                    onRemoveItem={(index) => handleRemoveBudgetItem('actualExpenses', index)}
                    onUpdateItem={(index, field, value) => handleUpdateBudgetItem('actualExpenses', index, field, value)}
                 />
              </CardContent>
            </Card>
        )}

        <Card className="shadow-none border-0 sm:border sm:shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl font-semibold text-primary flex items-center">
              <Users className="mr-2 h-5 w-5" /> Participants ({participantsSummary.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {participantsSummary.length > 0 ? (
               <>
                {/* Desktop Table View */}
                <div className="hidden md:block participant-desktop-view">
                  <ScrollArea className="max-h-[600px] border rounded-md print-scroll">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
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
                            <TableCell className="font-medium flex items-center gap-3">
                               {summary.type === 'member' ? (
                                 <Avatar className="h-9 w-9">
                                  <AvatarImage src={summary.userPhotoUrl} alt={summary.userName} data-ai-hint="profile avatar" />
                                  <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                                      {getInitials(summary.userName)}
                                  </AvatarFallback>
                                </Avatar>
                               ) : (
                                <div className="flex items-center justify-center h-9 w-9">
                                 <Star className="h-7 w-7 text-yellow-500" />
                                </div>
                               )}
                               <span>{summary.userName || summary.visitorName}</span>
                            </TableCell>
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
                  </ScrollArea>
                </div>
                {/* Mobile Card View */}
                <div className="block md:hidden participant-mobile-view space-y-3">
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
