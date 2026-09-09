/**
 * @fileOverview Utility to generate iCalendar (.ics) files from club events.
 * Compatible with RFC 5545 standard for import into WordPress, Google Calendar, etc.
 */

import type { Event } from '@/types';
import { format, parseISO, isValid } from 'date-fns';

/**
 * Formats a date string to the ICS required format: YYYYMMDDTHHMMSSZ
 */
const formatIcsDate = (dateStr: string): string => {
  const date = parseISO(dateStr);
  if (!isValid(date)) return '';
  return format(date, "yyyyMMdd'T'HHmmss'Z'");
};

/**
 * Escapes special characters for ICS text fields
 */
const escapeText = (text: string): string => {
  return text
    .replace(/[\\,;]/g, (match) => `\\${match}`)
    .replace(/\n/g, '\\n');
};

/**
 * Generates an RFC 5545 compliant string from an array of events
 */
export function generateIcsString(events: Event[]): string {
  const PRODID = "-//Leo Club of Athugalpura//LeoPortal//EN";
  
  let icsLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Leo Club Year Plan",
    "X-WR-TIMEZONE:Asia/Colombo"
  ];

  events.forEach((event) => {
    if (!event.startDate) return;

    const dtStart = formatIcsDate(event.startDate);
    // If no end date, default to 1 hour after start
    const dtEnd = event.endDate 
      ? formatIcsDate(event.endDate) 
      : formatIcsDate(new Date(parseISO(event.startDate).getTime() + 60 * 60 * 1000).toISOString());

    icsLines.push("BEGIN:VEVENT");
    icsLines.push(`UID:${event.id}@leoportal.athugalpura`);
    icsLines.push(`DTSTAMP:${formatIcsDate(new Date().toISOString())}`);
    icsLines.push(`DTSTART:${dtStart}`);
    if (dtEnd) icsLines.push(`DTEND:${dtEnd}`);
    icsLines.push(`SUMMARY:${escapeText(event.name)}`);
    icsLines.push(`DESCRIPTION:${escapeText(event.description)}`);
    if (event.location) icsLines.push(`LOCATION:${escapeText(event.location)}`);
    
    // Add category metadata if available
    if (event.eventType) {
      icsLines.push(`CATEGORIES:${event.eventType.toUpperCase().replace(/_/g, ' ')}`);
    }
    
    icsLines.push("STATUS:CONFIRMED");
    icsLines.push("SEQUENCE:0");
    icsLines.push("END:VEVENT");
  });

  icsLines.push("END:VCALENDAR");

  return icsLines.join("\r\n");
}

/**
 * Triggers a browser download of the generated ICS file
 */
export function downloadIcsFile(events: Event[], filename: string = "leo-club-calendar.ics") {
  const icsString = generateIcsString(events);
  const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
