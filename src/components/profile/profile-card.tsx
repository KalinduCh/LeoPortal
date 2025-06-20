
// src/components/profile/profile-card.tsx
"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Mail, User as UserIcon, Shield, Edit3, UploadCloud, Briefcase, Calendar as CalendarIconLucide, Phone, Smile, Loader2 } from 'lucide-react';
import type { User } from '@/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
// Removed Firebase Storage imports
import { useToast } from '@/hooks/use-toast';

const MAX_FILE_SIZE_KB = 200; // Max file size in KB for Base64 storage

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  nic: z.string().optional(),
  dateOfBirth: z.string().optional(), 
  gender: z.string().optional(),
  mobileNumber: z.string().optional(),
  photoUrl: z.string().optional(), // Will store Base64 data URI or placeholder
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface ProfileCardProps {
  user: User;
  onUpdateProfile: (updatedData: Partial<User>) => Promise<void>;
  isUpdatingProfile: boolean; 
}

export function ProfileCard({ user, onUpdateProfile, isUpdatingProfile: isParentUpdating }: ProfileCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedBase64Image, setSelectedBase64Image] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(user.photoUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user.name || "",
      nic: user.nic || "",
      dateOfBirth: user.dateOfBirth || "",
      gender: user.gender || "",
      mobileNumber: user.mobileNumber || "",
      photoUrl: user.photoUrl || "",
    },
  });

  useEffect(() => {
    form.reset({
      name: user.name || "",
      nic: user.nic || "",
      dateOfBirth: user.dateOfBirth || "",
      gender: user.gender || "",
      mobileNumber: user.mobileNumber || "",
      photoUrl: user.photoUrl || "",
    });
    if (!isEditing) {
        setImagePreviewUrl(user.photoUrl || null);
        setSelectedBase64Image(null); 
    }
  }, [user, form, isEditing]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > MAX_FILE_SIZE_KB * 1024) { 
        toast({ title: "File Too Large", description: `Profile image must be less than ${MAX_FILE_SIZE_KB}KB.`, variant: "destructive" });
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast({ title: "Invalid File Type", description: "Please select an image file.", variant: "destructive" });
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setSelectedBase64Image(base64String);
        setImagePreviewUrl(base64String);
      };
      reader.onerror = () => {
        toast({ title: "File Read Error", description: "Could not read the image file.", variant: "destructive" });
        setSelectedBase64Image(null);
        setImagePreviewUrl(user.photoUrl || null); // Revert to original if read fails
      }
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = async (values: ProfileFormValues) => {
    let finalPhotoUrl = user.photoUrl; // Keep existing photo by default

    if (selectedBase64Image) {
      finalPhotoUrl = selectedBase64Image; // Use new Base64 image if selected
    }
    
    let dobToSave: string | undefined = undefined;
    if (values.dateOfBirth) {
        if (values.dateOfBirth instanceof Date) { // Should not happen with string from form
            dobToSave = format(values.dateOfBirth, "yyyy-MM-dd");
        } else { // It's already a string or undefined
            const parsedFromString = parseISO(values.dateOfBirth);
            if (isValid(parsedFromString)) {
                dobToSave = format(parsedFromString, "yyyy-MM-dd");
            } else {
                dobToSave = values.dateOfBirth; 
            }
        }
    }
    
    await onUpdateProfile({
      id: user.id, 
      name: values.name,
      nic: values.nic,
      gender: values.gender,
      mobileNumber: values.mobileNumber,
      photoUrl: finalPhotoUrl, // This will be the Base64 string or existing URL
      dateOfBirth: dobToSave,
    });
    setIsEditing(false); 
    setSelectedBase64Image(null); // Clear selected Base64 image after successful update
  };

  const getInitials = (name?: string) => {
    if (!name) return "??";
    const names = name.split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };
  
  let displayFormattedDoB: string | undefined = undefined;
  if (user.dateOfBirth && typeof user.dateOfBirth === 'string') {
    const parsedDate = parseISO(user.dateOfBirth);
    if (isValid(parsedDate)) {
      displayFormattedDoB = format(parsedDate, "MMMM d, yyyy");
    }
  }
  
  const selectedDateForPicker = form.watch("dateOfBirth");
  let dateForPicker: Date | undefined = undefined;
  if (selectedDateForPicker) {
    if (selectedDateForPicker instanceof Date) {
      dateForPicker = selectedDateForPicker;
    } else if (typeof selectedDateForPicker === 'string') {
      const parsed = parseISO(selectedDateForPicker);
      if (isValid(parsed)) {
        dateForPicker = parsed;
      }
    }
  }

  const currentLoadingState = isParentUpdating; // Removed isUploadingImage

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader className="text-center">
        <div className="relative mx-auto w-32 h-32 mb-4">
          <Avatar className="w-32 h-32 border-4 border-primary shadow-md">
            <AvatarImage src={imagePreviewUrl || user.photoUrl} alt={user.name} data-ai-hint="profile large_avatar" />
            <AvatarFallback className="text-4xl bg-primary/20 text-primary font-bold">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          {isEditing && (
            <>
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
              />
              <Button 
                variant="outline" 
                size="icon" 
                className="absolute bottom-0 right-0 rounded-full bg-background hover:bg-accent" 
                onClick={() => fileInputRef.current?.click()}
                disabled={currentLoadingState}
              >
                <UploadCloud className="h-5 w-5" />
                <span className="sr-only">Upload new photo</span>
              </Button>
            </>
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
                    <FormControl><Input {...field} disabled={currentLoadingState} /></FormControl>
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
                    <FormControl><Input {...field} disabled={currentLoadingState} /></FormControl>
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
                            disabled={currentLoadingState}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {dateForPicker ? (
                              format(dateForPicker, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIconLucide className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={dateForPicker} 
                          onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")} 
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01") || currentLoadingState
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
                    <FormControl><Input placeholder="e.g., Male, Female, Other" {...field} disabled={currentLoadingState} /></FormControl>
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
                    <FormControl><Input type="tel" {...field} disabled={currentLoadingState} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => {setIsEditing(false); setSelectedBase64Image(null); setImagePreviewUrl(user.photoUrl || null);}} disabled={currentLoadingState}>Cancel</Button>
                <Button type="submit" disabled={currentLoadingState}>
                  {currentLoadingState && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {currentLoadingState ? "Saving..." : "Save Changes"}
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
            <ProfileInfoItem icon={CalendarIconLucide} label="Date of Birth" value={displayFormattedDoB} />
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
