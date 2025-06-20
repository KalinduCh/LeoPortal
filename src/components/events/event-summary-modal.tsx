// src/components/events/event-summary-modal.tsx
"use client";

import React, { useRef } from 'react';
import type { Event, User } from '@/types';
import { Button } from '@/components/ui/button';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarDays, MapPin, Info, Users, Printer, X, Briefcase, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useReactToPrint } from 'react-to-print';

export interface EventParticipantSummary {
  user: User;
  attendanceTimestamp: string; // ISO string
}

interface EventSummaryModalProps {
  event: Event;
  participantsSummary: EventParticipantSummary[];
  onClose: () => void;
}

export function EventSummaryModal({ event, participantsSummary, onClose }: EventSummaryModalProps) {
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `Event Summary - ${event.name}`,
  });

  const getInitials = (name?: string) => {
    if (!name) return "??";
    const names = name.split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  }

  return (
    <>
      <div ref={componentRef} className="p-6 space-y-6 modal-print-area">
        <DialogHeader className="print-header">
          <DialogTitle className="text-2xl font-bold text-primary font-headline print-title">{event.name}</DialogTitle>
          <DialogDescription className="print-description">Summary of the event and participant details.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print-section">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-muted-foreground print-subtitle">Event Details</h3>
            <div className="flex items-center text-sm">
              <CalendarDays className="mr-2 h-4 w-4 text-primary" />
              <span>{format(parseISO(event.date), "MMMM d, yyyy 'at' h:mm a")}</span>
            </div>
            <div className="flex items-start text-sm">
              <MapPin className="mr-2 h-4 w-4 mt-0.5 shrink-0 text-primary" />
              <span className="text-muted-foreground">{event.location}</span>
            </div>
            {event.latitude !== undefined && event.longitude !== undefined && (
              <p className="text-xs text-muted-foreground">
                (Coordinates: {event.latitude}, {event.longitude})
              </p>
            )}
            <div className="flex items-start text-sm">
              <Info className="mr-2 h-4 w-4 mt-0.5 shrink-0 text-primary" />
              <p className="text-muted-foreground leading-relaxed">{event.description}</p>
            </div>
          </div>

          <div className="space-y-3 print-section">
            <h3 className="text-lg font-semibold text-muted-foreground print-subtitle flex items-center">
              <Users className="mr-2 h-5 w-5 text-primary" />
              Participants ({participantsSummary.length})
            </h3>
            {participantsSummary.length > 0 ? (
              <ScrollArea className="h-[200px] md:h-[250px] border rounded-md print-scroll">
                <Table className="print-table">
                  <TableHeader className="print-table-header">
                    <TableRow>
                      <TableHead className="print-hide">Avatar</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead><Briefcase className="inline-block mr-1 h-3 w-3 print-hide" />Designation</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead><Clock className="inline-block mr-1 h-3 w-3 print-hide" />Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="print-table-body">
                    {participantsSummary.map((summary) => (
                      <TableRow key={summary.user.id}>
                        <TableCell className="print-hide">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={summary.user.photoUrl} alt={summary.user.name} data-ai-hint="profile avatar" />
                            <AvatarFallback>{getInitials(summary.user.name)}</AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="font-medium">{summary.user.name}</TableCell>
                        <TableCell className="capitalize text-xs">{summary.user.role}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{summary.user.email}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(parseISO(summary.attendanceTimestamp), "MMM d, h:mm a")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground italic">No participants recorded for this event.</p>
            )}
          </div>
        </div>
      </div>
      <DialogFooter className="pt-6 border-t print-hide">
        <Button variant="outline" onClick={onClose}>
          <X className="mr-2 h-4 w-4" /> Close
        </Button>
        <Button onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" /> Download Summary
        </Button>
      </DialogFooter>
    </>
  );
}
