
// src/app/(authenticated)/calendar/page.tsx
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function CalendarPage() {
  const [isLoading, setIsLoading] = useState(false); // Placeholder for now

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold font-headline mb-6">Year Plan Calendar</h1>
      <Card>
        <CardHeader>
          <CardTitle>Project & Event Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-96">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : (
            <div className="flex justify-center items-center h-96 bg-muted/50 rounded-lg">
                <p className="text-muted-foreground">Calendar view coming soon...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
