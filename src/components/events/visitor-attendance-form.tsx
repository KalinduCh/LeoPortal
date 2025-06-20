
// src/components/events/visitor-attendance-form.tsx
"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
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
} from '@/components/ui/form';
import { Loader2, User, Briefcase, Users, MessageSquare, CalendarCheck } from 'lucide-react';

const visitorAttendanceFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  designation: z.string().min(2, { message: "Designation must be at least 2 characters." }),
  club: z.string().min(2, { message: "Club name must be at least 2 characters." }),
  comment: z.string().optional(),
});

export type VisitorAttendanceFormValues = z.infer<typeof visitorAttendanceFormSchema>;

interface VisitorAttendanceFormProps {
  onSubmit: (data: VisitorAttendanceFormValues) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  eventDate: string;
}

export function VisitorAttendanceForm({ onSubmit, onCancel, isLoading, eventDate }: VisitorAttendanceFormProps) {
  const form = useForm<VisitorAttendanceFormValues>({
    resolver: zodResolver(visitorAttendanceFormSchema),
    defaultValues: {
      name: "",
      designation: "",
      club: "",
      comment: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
        <div className="p-3 mb-3 bg-muted/50 rounded-md text-sm">
            <p className="flex items-center font-medium">
                <CalendarCheck className="mr-2 h-4 w-4 text-primary"/> Event Date: {eventDate}
            </p>
        </div>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center"><User className="mr-1.5 h-4 w-4 text-muted-foreground"/> Full Name *</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="designation"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center"><Briefcase className="mr-1.5 h-4 w-4 text-muted-foreground"/> Designation *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Club President, District Officer" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="club"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center"><Users className="mr-1.5 h-4 w-4 text-muted-foreground"/> Your LEO Club *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Leo Club of Metro City" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="comment"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center"><MessageSquare className="mr-1.5 h-4 w-4 text-muted-foreground"/> Comment (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any remarks or comments..."
                  className="resize-y min-h-[80px]"
                  {...field}
                  disabled={isLoading}
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
            Submit Attendance
          </Button>
        </div>
      </form>
    </Form>
  );
}
