
// src/components/events/event-card.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Event, UserRole, AttendanceRecord, User } from '@/types';
import { CalendarDays, MapPin, Info, CheckCircle, Clock, Navigation, CalendarPlus } from 'lucide-react';
import { format, parseISO, isFuture, isPast, isValid, isWithinInterval } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { getCurrentPosition, calculateDistanceInMeters, MAX_ATTENDANCE_DISTANCE_METERS } from '@/lib/geolocation';
import { markUserAttendance, type MarkAttendanceResult } from '@/services/attendanceService';
import { Separator } from '../ui/separator';
import { Badge } from "@/components/ui/badge";

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

  if (!event.startDate || !isValid(parseISO(event.startDate))) {
    return (
        <Card className="w-full shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out flex flex-col">
            <CardHeader><CardTitle className="font-headline text-xl text-destructive">Invalid Event Data</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-destructive-foreground">This event has an invalid date and cannot be displayed.</p></CardContent>
        </Card>
    );
  }

  const eventStartDateObj = parseISO(event.startDate);
  let formattedDate = format(eventStartDateObj, "MMM d, yyyy, h:mm a");

  if (event.endDate && isValid(parseISO(event.endDate))) {
    const eventEndDateObj = parseISO(event.endDate);
    if (eventEndDateObj.toDateString() !== eventStartDateObj.toDateString()) {
      // Different days
      formattedDate = `${format(eventStartDateObj, "MMM d, h:mm a")} - ${format(eventEndDateObj, "MMM d, h:mm a")}`;
    } else {
      // Same day, different time
      formattedDate = `${format(eventStartDateObj, "MMM d, yyyy, h:mm a")} - ${format(eventEndDateObj, "h:mm a")}`;
    }
  }

  const now = new Date();
  const endDateForCheck = event.endDate && isValid(parseISO(event.endDate)) 
                ? parseISO(event.endDate) 
                : new Date(eventStartDateObj.getTime() + 24 * 60 * 60 * 1000); // Default 24h duration if no end date

  let eventStatus: 'Ongoing' | 'Upcoming' | 'Past' = 'Past';
  let statusClassName = 'bg-gray-500 hover:bg-gray-600 text-white';

  if (isWithinInterval(now, { start: eventStartDateObj, end: endDateForCheck })) {
      eventStatus = 'Ongoing';
      statusClassName = 'bg-blue-600 hover:bg-blue-700 text-white';
  } else if (isFuture(eventStartDateObj)) {
      eventStatus = 'Upcoming';
      statusClassName = 'bg-green-600 hover:bg-green-700 text-white';
  }
  
  const isDeadline = event.eventType === 'deadline';
  const canMarkAttendance = userRole === 'member' && eventStatus === 'Ongoing' && !currentAttendanceRecord && !isDeadline;
  const isGeoRestrictionActive = typeof event.latitude === 'number' && typeof event.longitude === 'number';

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
      if (isGeoRestrictionActive && event.latitude && event.longitude) { 
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
      }

      const result: MarkAttendanceResult = await markUserAttendance(event.id, user.id, userLatitude, userLongitude);

      if (result.status === 'success' || result.status === 'already_marked') {
        toast({ title: result.status === 'success' ? "Attendance Marked!" : "Attendance Info", description: result.message });
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

  const handleAddToCalendar = () => {
    const formatGoogleCalendarDate = (date: Date): string => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const startDate = parseISO(event.startDate);
    const endDate = event.endDate ? parseISO(event.endDate) : new Date(startDate.getTime() + 60 * 60 * 1000);

    const googleCalendarUrl = new URL("https://www.google.com/calendar/render");
    googleCalendarUrl.searchParams.append("action", "TEMPLATE");
    googleCalendarUrl.searchParams.append("text", event.name);
    googleCalendarUrl.searchParams.append("dates", `${formatGoogleCalendarDate(startDate)}/${formatGoogleCalendarDate(endDate)}`);
    googleCalendarUrl.searchParams.append("details", event.description);
    if (event.location) {
        googleCalendarUrl.searchParams.append("location", event.location);
    }

    window.open(googleCalendarUrl.toString(), "_blank");
  };
  
  const getButtonText = () => {
    if (isSubmittingAttendance) return "Processing...";
    if (eventStatus === 'Upcoming') return "Event Has Not Started";
    if (eventStatus === 'Past') return "Event Has Ended";
    return "Mark My Attendance";
  };
  
  return (
    <Card className="w-full shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
            <CardTitle className="font-headline text-xl pr-2">{event.name}</CardTitle>
            <Badge variant="default" className={statusClassName}>{eventStatus}</Badge>
        </div>
        <div className="flex items-center text-sm text-muted-foreground pt-1">
          <CalendarDays className="mr-2 h-4 w-4" />
          <span>{formattedDate}</span>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="space-y-3">
          {!isDeadline && event.location && (
            <div className="flex items-start text-sm">
                <MapPin className="mr-2 h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span className="text-muted-foreground">{event.location}</span>
            </div>
          )}
          {isGeoRestrictionActive && !isDeadline && (
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
      <CardFooter className="border-t pt-4 flex-col gap-3">
        {userRole === 'member' && !isDeadline && (
          <div className="w-full">
            {currentAttendanceRecord && currentAttendanceRecord.status === 'present' ? (
              <div className="flex items-center justify-center p-2 rounded-md bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                <CheckCircle className="mr-2 h-5 w-5" />
                Attended on {format(parseISO(currentAttendanceRecord.timestamp), "MMM d, h:mm a")}
              </div>
            ) : (
              <Button 
                className="w-full" 
                onClick={handleMarkAttendance}
                disabled={!canMarkAttendance || isSubmittingAttendance}
              >
                {isSubmittingAttendance ? <Clock className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                {getButtonText()}
              </Button>
            )}
          </div>
        )}
         {userRole === 'admin' && !isDeadline && (
          <div className="text-xs text-muted-foreground w-full text-center">
            {isGeoRestrictionActive 
              ? "Geo-restricted attendance is enabled."
              : "Standard attendance marking is enabled."}
          </div>
        )}
        {(userRole === 'member' || userRole === 'admin') && eventStatus !== 'Past' && (
            <>
              {((userRole === 'member' && !currentAttendanceRecord && !isDeadline) || isDeadline) && <Separator />}
              <Button onClick={handleAddToCalendar} variant="outline" className="w-full">
                  <CalendarPlus className="mr-2 h-4 w-4"/>
                  Add to Google Calendar
              </Button>
            </>
        )}
      </CardFooter>
    </Card>
  );
}
