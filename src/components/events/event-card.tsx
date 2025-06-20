
// src/components/events/event-card.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Event, UserRole, AttendanceRecord, User } from '@/types';
import { CalendarDays, MapPin, Info, CheckCircle, XCircle, Clock, Navigation, AlertTriangle } from 'lucide-react';
import { format, parseISO, isFuture, isPast } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { getCurrentPosition, calculateDistanceInMeters, MAX_ATTENDANCE_DISTANCE_METERS } from '@/lib/geolocation';
import { markUserAttendance, type MarkAttendanceResult } from '@/services/attendanceService';

interface EventCardProps {
  event: Event;
  user: User | null; 
  userRole: UserRole;
  attendanceRecord?: AttendanceRecord | null; 
  onAttendanceMarked: () => void; 
}

export function EventCard({ event, user, userRole, attendanceRecord: initialAttendanceRecord, onAttendanceMarked }: EventCardProps) {
  const { toast } = useToast();
  const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false);
  const [currentAttendanceRecord, setCurrentAttendanceRecord] = useState(initialAttendanceRecord);

  useEffect(() => {
    setCurrentAttendanceRecord(initialAttendanceRecord);
  }, [initialAttendanceRecord]);

  const eventDate = parseISO(event.date);
  const formattedDate = format(eventDate, "MMMM d, yyyy 'at' h:mm a");
  const isEventUpcoming = isFuture(eventDate);
  const isEventPast = isPast(eventDate);

  // Corrected: Check if latitude and longitude are valid numbers for geo-restriction
  const isGeoRestrictionActive = typeof event.latitude === 'number' && typeof event.longitude === 'number';

  const canAttemptToMarkAttendance = userRole === 'member' && isEventUpcoming && !currentAttendanceRecord;

  const handleMarkAttendance = async () => {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in to mark attendance.", variant: "destructive" });
      return;
    }
    if (!event.id) {
        toast({ title: "Event Error", description: "Event ID is missing. Cannot mark attendance.", variant: "destructive" });
        return;
    }

    setIsSubmittingAttendance(true);
    let userLatitude: number | undefined = undefined;
    let userLongitude: number | undefined = undefined;

    try {
      // Use the isGeoRestrictionActive flag
      if (isGeoRestrictionActive && event.latitude && event.longitude) { // Also ensure event.latitude/longitude are truthy for the check
        const position = await getCurrentPosition(); 
        userLatitude = position.latitude;
        userLongitude = position.longitude;
        
        const distance = calculateDistanceInMeters(
          position.latitude,
          position.longitude,
          event.latitude, 
          event.longitude
        );

        if (distance > MAX_ATTENDANCE_DISTANCE_METERS) {
          toast({
            title: "Too Far",
            description: `You must be within ${MAX_ATTENDANCE_DISTANCE_METERS} meters of the event location. You are approximately ${Math.round(distance)}m away.`,
            variant: "destructive",
            duration: 7000,
          });
          setIsSubmittingAttendance(false);
          return;
        }
        toast({ title: "Location Verified", description: `You are within the allowed radius (${Math.round(distance)}m). Marking attendance...`, duration: 3000 });
      } else {
        toast({ title: "Marking Attendance", description: "Event location not specified or geo-restriction not active, proceeding without geo-check.", duration: 3000 });
      }

      const result: MarkAttendanceResult = await markUserAttendance(event.id, user.id, userLatitude, userLongitude);

      if (result.status === 'success') {
        toast({ title: "Attendance Marked!", description: result.message, variant: "default" });
        if (result.record) setCurrentAttendanceRecord(result.record);
        onAttendanceMarked();
      } else if (result.status === 'already_marked') {
        toast({ title: "Attendance Information", description: result.message, variant: "default" });
        if (result.record) setCurrentAttendanceRecord(result.record);
        onAttendanceMarked(); 
      } else {
        toast({ title: "Attendance Error", description: result.message || "An unknown issue occurred.", variant: "destructive" });
      }

    } catch (error: any) {
      console.error("Error during attendance marking process:", error);
      let description = "Could not mark attendance.";
      const errorMessage = error.message || "An unknown error occurred.";

      if (errorMessage.includes("Geolocation is not supported")) {
        description = "Geolocation is not supported by your browser.";
      } else if (errorMessage.includes("User denied the request")) {
        description = "Location permission denied. Please enable location services to mark attendance.";
      } else if (errorMessage.includes("Location information is unavailable") || errorMessage.includes("timed out")) {
        description = "Could not determine your location. Please try again.";
      } else {
        description = `Could not mark attendance: ${errorMessage.substring(0, 150)}${errorMessage.length > 150 ? '...' : ''}`;
      }
      toast({ title: "Attendance Error", description, variant: "destructive", duration: 10000 });
    } finally {
      setIsSubmittingAttendance(false);
    }
  };

  return (
    <Card className="w-full shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out flex flex-col">
      <CardHeader>
        <CardTitle className="font-headline text-xl">{event.name}</CardTitle>
        <div className="flex items-center text-sm text-muted-foreground pt-1">
          <CalendarDays className="mr-2 h-4 w-4" />
          <span>{formattedDate}</span>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="space-y-3">
          <div className="flex items-start text-sm">
            <MapPin className="mr-2 h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <span className="text-muted-foreground">{event.location}</span>
          </div>
          {/* Use the isGeoRestrictionActive flag for display */}
          {isGeoRestrictionActive && (
             <div className="flex items-start text-xs text-muted-foreground">
                <Navigation className="mr-2 h-3 w-3 mt-0.5 shrink-0 text-green-600" />
                <span>Geo-restricted attendance enabled.</span>
            </div>
          )}
          <div className="flex items-start text-sm">
            <Info className="mr-2 h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <p className="text-muted-foreground leading-relaxed">{event.description}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4">
        {userRole === 'member' && (
          <div className="w-full">
            {currentAttendanceRecord && currentAttendanceRecord.status === 'present' && (
              <div className={`flex items-center p-2 rounded-md bg-green-100 text-green-700`}>
                <CheckCircle className="mr-2 h-5 w-5" />
                Attended on {format(parseISO(currentAttendanceRecord.timestamp), "MMM d, h:mm a")}
              </div>
            )}
            {canAttemptToMarkAttendance && (
              <Button 
                className="w-full" 
                onClick={handleMarkAttendance}
                disabled={isSubmittingAttendance}
              >
                {isSubmittingAttendance ? <Clock className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                {isSubmittingAttendance ? "Processing..." : "Mark My Attendance"}
              </Button>
            )}
            {!canAttemptToMarkAttendance && !currentAttendanceRecord && isEventUpcoming && (
               <p className="text-sm text-center text-muted-foreground">Attendance marking will be available if conditions are met.</p>
            )}
            {isEventPast && !currentAttendanceRecord && (
               <p className="text-sm text-center text-muted-foreground">Attendance for this past event was not recorded.</p>
            )}
             {isEventPast && currentAttendanceRecord && currentAttendanceRecord.status !== 'present' && (
               <p className="text-sm text-center text-muted-foreground">Attendance for this past event was not marked as present.</p>
            )}
          </div>
        )}
         {userRole === 'admin' && (
          <div className="text-xs text-muted-foreground">
            {isGeoRestrictionActive 
              ? "Geo-restricted attendance is enabled for this event."
              : "Standard attendance marking (no geo-restriction)."}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
