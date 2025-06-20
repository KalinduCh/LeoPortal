// src/components/members/member-edit-form.tsx
"use client";

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import type { User, UserRole } from '@/types';

const memberEditFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  role: z.enum(['member', 'admin'], { required_error: "Role is required." })
});

export type MemberEditFormValues = z.infer<typeof memberEditFormSchema>;

interface MemberEditFormProps {
  member: User; // Current member data to pre-fill
  onSubmit: (data: MemberEditFormValues) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function MemberEditForm({ member, onSubmit, onCancel, isLoading }: MemberEditFormProps) {
  const form = useForm<MemberEditFormValues>({
    resolver: zodResolver(memberEditFormSchema),
    defaultValues: {
      name: member.name || "",
      role: member.role || "member",
    },
  });

  useEffect(() => {
    form.reset({
      name: member.name || "",
      role: member.role || "member",
    });
  }, [member, form]);

  const handleFormSubmit = async (values: MemberEditFormValues) => {
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
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Email is typically not editable directly this way */}
        {/* <FormItem>
            <FormLabel>Email (Cannot be changed)</FormLabel>
            <Input value={member.email} disabled />
        </FormItem> */}


        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </Form>
  );
}
