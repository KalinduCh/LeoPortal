
// src/components/profile/profile-card.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Mail, User as UserIcon, Shield, Edit3, UploadCloud, Briefcase, Calendar, Phone, Smile } from 'lucide-react';
import type { User } from '@/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';


const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  nic: z.string().optional(),
  dateOfBirth: z.string().optional(), // Storing as string, can be refined with date validation
  gender: z.string().optional(),
  mobileNumber: z.string().optional(),
  // photoUrl is handled separately
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface ProfileCardProps {
  user: User;
  onUpdateProfile: (updatedData: Partial<User>) => Promise<void>;
  isUpdatingProfile: boolean;
}

export function ProfileCard({ user, onUpdateProfile, isUpdatingProfile }: ProfileCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user.name || "",
      nic: user.nic || "",
      dateOfBirth: user.dateOfBirth || "",
      gender: user.gender || "",
      mobileNumber: user.mobileNumber || "",
    },
  });

  useEffect(() => {
    form.reset({
      name: user.name || "",
      nic: user.nic || "",
      dateOfBirth: user.dateOfBirth || "",
      gender: user.gender || "",
      mobileNumber: user.mobileNumber || "",
    });
  }, [user, form, isEditing]); // Reset form when user data changes or edit mode toggles

  const handleFormSubmit = async (values: ProfileFormValues) => {
    await onUpdateProfile({
      id: user.id, // pass id for service to know which user to update
      ...values,
      // For dateOfBirth, if it's a Date object from a picker, format it
      dateOfBirth: values.dateOfBirth instanceof Date ? format(values.dateOfBirth, "yyyy-MM-dd") : values.dateOfBirth
    });
    setIsEditing(false); // Exit edit mode on successful submission
  };

  const getInitials = (name?: string) => {
    if (!name) return "??";
    const names = name.split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };
  
  const initialDate = user.dateOfBirth ? parseISO(user.dateOfBirth) : undefined;
  const selectedDate = form.watch("dateOfBirth");
  let displayDate: Date | undefined = undefined;
  if (typeof selectedDate === 'string' && selectedDate) {
    const parsed = parseISO(selectedDate);
    if (isValid(parsed)) {
      displayDate = parsed;
    }
  } else if (selectedDate instanceof Date) {
    displayDate = selectedDate;
  }


  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader className="text-center">
        <div className="relative mx-auto w-32 h-32 mb-4">
          <Avatar className="w-32 h-32 border-4 border-primary shadow-md">
            <AvatarImage src={user.photoUrl} alt={user.name} data-ai-hint="profile large_avatar" />
            <AvatarFallback className="text-4xl bg-primary/20 text-primary font-bold">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          {isEditing && (
            <Button variant="outline" size="icon" className="absolute bottom-0 right-0 rounded-full bg-background hover:bg-accent" disabled>
              <UploadCloud className="h-5 w-5" />
              <span className="sr-only">Upload new photo (disabled)</span>
            </Button>
          )}
        </div>
        <CardTitle className="text-3xl font-headline">{user.name}</CardTitle>
        <CardDescription className="text-lg text-primary capitalize">{user.role}</CardDescription>
      </CardHeader>
      <Separator />
      <CardContent className="pt-6 space-y-6">
        {isEditing ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <Input type="email" value={user.email} disabled />
                <p className="text-xs text-muted-foreground pt-1">Email cannot be changed.</p>
              </FormItem>
               <FormField
                control={form.control}
                name="nic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIC</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date of Birth</FormLabel>
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
                            {displayDate ? (
                              format(displayDate, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <Calendar className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={displayDate}
                          onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                          captionLayout="dropdown-buttons"
                          fromYear={1900}
                          toYear={new Date().getFullYear()}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <FormControl><Input placeholder="e.g., Male, Female, Other" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mobileNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number</FormLabel>
                    <FormControl><Input type="tel" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)} disabled={isUpdatingProfile}>Cancel</Button>
                <Button type="submit" disabled={isUpdatingProfile}>
                  {isUpdatingProfile ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <>
            <ProfileInfoItem icon={UserIcon} label="Full Name" value={user.name} />
            <ProfileInfoItem icon={Mail} label="Email Address" value={user.email} />
            <ProfileInfoItem icon={Shield} label="Role" value={user.role} className="capitalize" />
            <ProfileInfoItem icon={Briefcase} label="NIC" value={user.nic} />
            <ProfileInfoItem icon={Calendar} label="Date of Birth" value={user.dateOfBirth ? format(parseISO(user.dateOfBirth), "MMMM d, yyyy") : undefined} />
            <ProfileInfoItem icon={Smile} label="Gender" value={user.gender} />
            <ProfileInfoItem icon={Phone} label="Mobile Number" value={user.mobileNumber} />
            
            <div className="pt-4 text-right">
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit3 className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface ProfileInfoItemProps {
  icon: React.ElementType;
  label: string;
  value?: string;
  className?: string;
}

const ProfileInfoItem: React.FC<ProfileInfoItemProps> = ({ icon: Icon, label, value, className }) => (
  <div className="flex items-start space-x-3">
    <Icon className="h-5 w-5 text-muted-foreground mt-1" />
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("font-medium", className)}>{value || <span className="italic text-muted-foreground/70">Not set</span>}</p>
    </div>
  </div>
);
