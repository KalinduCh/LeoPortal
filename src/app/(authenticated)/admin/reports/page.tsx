// src/app/(authenticated)/admin/reports/page.tsx
"use client";

import React, { useState } from 'react';
import type { User, Event, AttendanceRecord } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Download, Loader2, Users, Calendar, BarChart } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { getAllUsers } from '@/services/userService';
import { getEvents } from '@/services/eventService';
import { getAllAttendanceRecords } from '@/services/attendanceService';
import { format, parseISO } from 'date-fns';

export default function ReportsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [isExportingMembers, setIsExportingMembers] = useState(false);
  const [isExportingEvents, setIsExportingEvents] = useState(false);
  const [isExportingAttendance, setIsExportingAttendance] = useState(false);

  React.useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  const escapeCsvField = (field: any): string => {
    if (field === null || field === undefined) {
      return '';
    }
    const stringField = String(field);
    // If the field contains a comma, double quote, or newline, wrap it in double quotes.
    if (/[",\n\r]/.test(stringField)) {
      // Also, double up any existing double quotes.
      return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
  };

  const handleExportMembers = async () => {
    setIsExportingMembers(true);
    toast({ title: "Generating Report...", description: "Fetching all member data." });
    try {
      const members = await getAllUsers();
      const headers = ['ID', 'Name', 'Email', 'Role', 'Status', 'Designation', 'NIC', 'DateOfBirth', 'Gender', 'MobileNumber'];
      const rows = members.map(member =>
        [
          escapeCsvField(member.id),
          escapeCsvField(member.name),
          escapeCsvField(member.email),
          escapeCsvField(member.role),
          escapeCsvField(member.status),
          escapeCsvField(member.designation),
          escapeCsvField(member.nic),
          escapeCsvField(member.dateOfBirth),
          escapeCsvField(member.gender),
          escapeCsvField(member.mobileNumber),
        ].join(',')
      );

      downloadCsv(
        [headers.join(','), ...rows].join('\n'),
        `leo-portal_members_${new Date().toISOString().split('T')[0]}.csv`
      );
      toast({ title: "Success", description: "Member data has been exported." });
    } catch (error) {
      console.error("Failed to export members:", error);
      toast({ title: "Error", description: "Could not export member data.", variant: "destructive" });
    }
    setIsExportingMembers(false);
  };

  const handleExportEvents = async () => {
    setIsExportingEvents(true);
    toast({ title: "Generating Report...", description: "Fetching all event data." });
    try {
      const events = await getEvents();
      const headers = ['ID', 'Name', 'StartDate', 'EndDate', 'Location', 'Description', 'Latitude', 'Longitude'];
      const rows = events.map(event =>
        [
          escapeCsvField(event.id),
          escapeCsvField(event.name),
          escapeCsvField(event.startDate ? format(parseISO(event.startDate), 'yyyy-MM-dd HH:mm:ss') : ''),
          escapeCsvField(event.endDate ? format(parseISO(event.endDate), 'yyyy-MM-dd HH:mm:ss') : ''),
          escapeCsvField(event.location),
          escapeCsvField(event.description),
          escapeCsvField(event.latitude),
          escapeCsvField(event.longitude),
        ].join(',')
      );
      downloadCsv(
        [headers.join(','), ...rows].join('\n'),
        `leo-portal_events_${new Date().toISOString().split('T')[0]}.csv`
      );
      toast({ title: "Success", description: "Event data has been exported." });
    } catch (error) {
      console.error("Failed to export events:", error);
      toast({ title: "Error", description: "Could not export event data.", variant: "destructive" });
    }
    setIsExportingEvents(false);
  };

  const handleExportAttendance = async () => {
    setIsExportingAttendance(true);
    toast({ title: "Generating Report...", description: "Fetching all attendance records." });
    try {
      const records = await getAllAttendanceRecords();
      const headers = ['RecordID', 'EventID', 'UserID', 'Timestamp', 'Status', 'AttendanceType', 'VisitorName', 'VisitorDesignation', 'VisitorClub', 'VisitorComment', 'MarkedLatitude', 'MarkedLongitude'];
      const rows = records.map(record =>
        [
          escapeCsvField(record.id),
          escapeCsvField(record.eventId),
          escapeCsvField(record.userId),
          escapeCsvField(record.timestamp ? format(parseISO(record.timestamp), 'yyyy-MM-dd HH:mm:ss') : ''),
          escapeCsvField(record.status),
          escapeCsvField(record.attendanceType),
          escapeCsvField(record.visitorName),
          escapeCsvField(record.visitorDesignation),
          escapeCsvField(record.visitorClub),
          escapeCsvField(record.visitorComment),
          escapeCsvField(record.markedLatitude),
          escapeCsvField(record.markedLongitude),
        ].join(',')
      );
      downloadCsv(
        [headers.join(','), ...rows].join('\n'),
        `leo-portal_attendance-log_${new Date().toISOString().split('T')[0]}.csv`
      );
      toast({ title: "Success", description: "Full attendance log has been exported." });
    } catch (error) {
      console.error("Failed to export attendance:", error);
      toast({ title: "Error", description: "Could not export attendance log.", variant: "destructive" });
    }
    setIsExportingAttendance(false);
  };

  const downloadCsv = (content: string, fileName: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (authLoading) {
    return <div className="flex items-center justify-center h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="container mx-auto py-4 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">Reports & Data Exports</h1>
        <p className="text-muted-foreground mt-1">Generate and download reports for members, events, and attendance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center text-xl"><Users className="mr-2 h-6 w-6 text-primary" /> Member Reports</CardTitle>
            <CardDescription>Export a full list of all registered members in the system.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">The CSV file will include all profile information for every user, including their role and approval status.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={handleExportMembers} disabled={isExportingMembers} className="w-full">
              {isExportingMembers ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {isExportingMembers ? 'Exporting...' : 'Export All Members (CSV)'}
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center text-xl"><Calendar className="mr-2 h-6 w-6 text-primary" /> Event Reports</CardTitle>
            <CardDescription>Export a full list of all created events, past and upcoming.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">The CSV file will contain event details such as name, dates, location, and description.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={handleExportEvents} disabled={isExportingEvents} className="w-full">
              {isExportingEvents ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {isExportingEvents ? 'Exporting...' : 'Export All Events (CSV)'}
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center text-xl"><BarChart className="mr-2 h-6 w-6 text-primary" /> Attendance Reports</CardTitle>
            <CardDescription>Export a complete log of all attendance records for all events.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">The CSV file will contain every attendance entry, including member and visitor details.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={handleExportAttendance} disabled={isExportingAttendance} className="w-full">
              {isExportingAttendance ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {isExportingAttendance ? 'Exporting...' : 'Export Attendance Log (CSV)'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
