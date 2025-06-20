
"use client";

import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import type { Event } from '@/types';
import { cn } from '@/lib/utils';

const eventFormSchema = z.object({
  name: z.string().min(3, { message: "Event name must be at least 3 characters." }),
  date: z.date({ required_error: "Event date is required." }),
  location: z.string().min(3, { message: "Location must be at least 3 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
});

export type EventFormValues = z.infer<typeof eventFormSchema>;

interface EventFormProps {
  event?: Event | null;
  onSubmit: (data: EventFormValues) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function EventForm({ event, onSubmit, onCancel, isLoading }: EventFormProps) {
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      name: event?.name || "",
      // Ensure date is a Date object for the form, parsing if necessary
      date: event?.date ? parseISO(event.date) : new Date(),
      location: event?.location || "",
      description: event?.description || "",
    },
  });

  useEffect(() => {
    if (event) {
      form.reset({
        name: event.name,
        date: parseISO(event.date),
        location: event.location,
        description: event.description,
      });
    } else {
      form.reset({
        name: "",
        date: new Date(),
        location: "",
        description: "",
      });
    }
  }, [event, form]);

  const handleFormSubmit = async (values: EventFormValues) => {
    await onSubmit(values);
  };

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

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Event Date & Time</FormLabel>
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
                        format(field.value, "PPP HH:mm") // Include time
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
                    onSelect={(date) => {
                        // Preserve time if date is cleared or a new date is picked
                        const newDate = date || field.value || new Date();
                        const currentTime = field.value || new Date();
                        newDate.setHours(currentTime.getHours());
                        newDate.setMinutes(currentTime.getMinutes());
                        field.onChange(newDate);
                    }}
                    initialFocus
                  />
                  {/* Basic Time Picker */}
                   <div className="p-2 border-t border-border">
                    <Label htmlFor="event-time" className="text-sm">Time</Label>
                    <Input
                      id="event-time"
                      type="time"
                      defaultValue={field.value ? format(field.value, "HH:mm") : "12:00"}
                      onChange={(e) => {
                        const [hours, minutes] = e.target.value.split(':').map(Number);
                        const newDate = new Date(field.value || Date.now());
                        newDate.setHours(hours);
                        newDate.setMinutes(minutes);
                        field.onChange(newDate);
                      }}
                      className="mt-1"
                    />
                  </div>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input placeholder="Community Hall" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
