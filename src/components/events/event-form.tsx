
"use client";

import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO, isValid } from 'date-fns';
import { CalendarIcon, Loader2, MapPin } from 'lucide-react';
import type { Event } from '@/types';
import { cn } from '@/lib/utils';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';

const eventFormSchema = z.object({
  name: z.string().min(3, { message: "Event name must be at least 3 characters." }),
  startDate: z.date({ required_error: "Event start date is required." }),
  endDate: z.date().optional(),
  location: z.string().min(3, { message: "Location must be at least 3 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  enableGeoRestriction: z.boolean().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
}).refine(data => {
  if (data.endDate) {
    return data.endDate > data.startDate;
  }
  return true;
}, {
  message: "End date must be after start date.",
  path: ["endDate"], 
}).refine(data => {
  if (data.enableGeoRestriction) {
    return data.latitude !== undefined && data.longitude !== undefined && !isNaN(data.latitude) && !isNaN(data.longitude);
  }
  return true;
}, {
  message: "Latitude and Longitude are required if geo-restriction is enabled.",
  path: ["latitude"], 
});

export type EventFormValues = z.infer<typeof eventFormSchema>;

interface EventFormProps {
  event?: Event | null;
  onSubmit: (data: EventFormValues) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const DateTimePicker = ({ field, label }: { field: any, label: string }) => {
    const handleDateSelect = (date: Date | undefined) => {
        const newDate = date || field.value || new Date();
        const currentTime = field.value || new Date(); // Keep existing time on date change
        newDate.setHours(currentTime.getHours());
        newDate.setMinutes(currentTime.getMinutes());
        field.onChange(newDate);
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const [hours, minutes] = e.target.value.split(':').map(Number);
        const newDate = new Date(field.value || Date.now());
        newDate.setHours(hours);
        newDate.setMinutes(minutes);
        field.onChange(newDate);
    };

    return (
        <FormItem className="flex flex-col">
          <FormLabel>{label}</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full pl-3 text-left font-normal",
                    !field.value && "text-muted-foreground"
                  )}
                >
                  {field.value ? (
                    format(field.value, "PPP HH:mm")
                  ) : (
                    <span>Pick a date and time</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={field.value}
                onSelect={handleDateSelect}
                captionLayout="dropdown-buttons"
                fromYear={new Date().getFullYear() - 10}
                toYear={new Date().getFullYear() + 10}
              />
               <div className="p-2 border-t border-border">
                <Label htmlFor={`time-${field.name}`} className="text-sm">Time</Label>
                <Input
                  id={`time-${field.name}`}
                  type="time"
                  defaultValue={field.value ? format(field.value, "HH:mm") : ""}
                  onChange={handleTimeChange}
                  className="mt-1"
                />
              </div>
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
    );
};

export function EventForm({ event, onSubmit, onCancel, isLoading }: EventFormProps) {
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      name: event?.name || "",
      startDate: event?.startDate && isValid(parseISO(event.startDate)) ? parseISO(event.startDate) : new Date(),
      endDate: event?.endDate && isValid(parseISO(event.endDate)) ? parseISO(event.endDate) : undefined,
      location: event?.location || "",
      description: event?.description || "",
      enableGeoRestriction: !!(event?.latitude !== undefined && event?.longitude !== undefined),
      latitude: event?.latitude,
      longitude: event?.longitude,
    },
  });

  useEffect(() => {
    form.reset({
      name: event?.name || "",
      startDate: event?.startDate && isValid(parseISO(event.startDate)) ? parseISO(event.startDate) : new Date(),
      endDate: event?.endDate && isValid(parseISO(event.endDate)) ? parseISO(event.endDate) : undefined,
      location: event?.location || "",
      description: event?.description || "",
      enableGeoRestriction: !!(event?.latitude !== undefined && event?.longitude !== undefined),
      latitude: event?.latitude,
      longitude: event?.longitude,
    });
  }, [event, form]);

  const handleFormSubmit = async (values: EventFormValues) => {
    const submissionValues = { ...values };
    if (!values.enableGeoRestriction) {
      submissionValues.latitude = undefined;
      submissionValues.longitude = undefined;
    }
    await onSubmit(submissionValues);
  };

  const geoRestrictionEnabled = form.watch("enableGeoRestriction");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Name</FormLabel>
              <FormControl>
                <Input placeholder="Annual Charity Gala" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => <DateTimePicker field={field} label="Start Date & Time" />}
            />
             <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => <DateTimePicker field={field} label="End Date & Time (Optional)" />}
            />
        </div>
        
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location (Text)</FormLabel>
              <FormControl>
                <Input placeholder="Community Hall, Main Street" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="enableGeoRestriction"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked);
                    if (!checked) {
                      form.setValue("latitude", undefined, { shouldValidate: true });
                      form.setValue("longitude", undefined, { shouldValidate: true });
                    }
                  }}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  Enable Geo-restriction for Attendance
                </FormLabel>
                <FormDescription className="text-xs">
                  If checked, members must be within a certain radius of the specified coordinates to mark attendance.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
        
        {geoRestrictionEnabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-md shadow-sm bg-muted/30">
            <FormField
              control={form.control}
              name="latitude"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><MapPin className="mr-1 h-4 w-4 text-muted-foreground"/>Latitude</FormLabel>
                  <FormControl>
                    <Input type="number" step="any" placeholder="e.g., 34.0522" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="longitude"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><MapPin className="mr-1 h-4 w-4 text-muted-foreground"/>Longitude</FormLabel>
                  <FormControl>
                    <Input type="number" step="any" placeholder="e.g., -118.2437" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell us more about the event..."
                  className="resize-y min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {event ? 'Save Changes' : 'Create Event'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
