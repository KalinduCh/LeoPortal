// src/components/profile/profile-card.tsx
"use client";

import React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Mail, User as UserIcon, Shield, Edit3, UploadCloud } from 'lucide-react';
import type { User } from '@/types';

interface ProfileCardProps {
  user: User;
  onUpdateProfile?: (updatedData: Partial<User>) => void; // Placeholder for future edit functionality
}

export function ProfileCard({ user, onUpdateProfile }: ProfileCardProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  // Form state would go here if editing is implemented

  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
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
            <Button variant="outline" size="icon" className="absolute bottom-0 right-0 rounded-full bg-background hover:bg-accent">
              <UploadCloud className="h-5 w-5" />
              <span className="sr-only">Upload new photo</span>
            </Button>
          )}
        </div>
        <CardTitle className="text-3xl font-headline">{user.name}</CardTitle>
        <CardDescription className="text-lg text-primary capitalize">{user.role}</CardDescription>
      </CardHeader>
      <Separator />
      <CardContent className="pt-6 space-y-6">
        {isEditing ? (
          <form className="space-y-4"> {/* onSubmit={handleFormSubmit} */}
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" defaultValue={user.name} />
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" defaultValue={user.email} disabled />
            </div>
             {/* Add more editable fields here: photoUrl, password change, etc. */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex items-center space-x-3">
              <UserIcon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="font-medium">{user.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email Address</p>
                <p className="font-medium">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <p className="font-medium capitalize">{user.role}</p>
              </div>
            </div>
             {/* Add more display fields here */}
            {onUpdateProfile && ( // Only show edit button if handler is provided
              <div className="pt-4 text-right">
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
