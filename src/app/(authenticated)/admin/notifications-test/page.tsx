
"use client";

import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useFcm } from '@/hooks/use-fcm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { sendTestPushAction } from '@/app/actions/notifications';
import { 
  BellRing, ShieldCheck, QrCode, Send, 
  Loader2, Smartphone, CheckCircle, AlertTriangle, 
  Clipboard, ClipboardCheck, Info, RefreshCw, Sparkles, Cake, CalendarClock, Ban, ClipboardList
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NotificationsTestPage() {
  const { user } = useAuth();
  const { requestPermission, retrieveToken, notificationPermissionStatus, token, isRetrieving } = useFcm(user);
  const { toast } = useToast();
  
  const [isSending, setIsSending] = useState(false);
  const [testTitle, setTestTitle] = useState('LeoPortal Test');
  const [testBody, setTestBody] = useState('Hello! This is a real-time push notification.');
  const [copied, setCopied] = useState(false);

  const presets = [
    {
      id: 'birthday',
      label: 'Birthday Wish',
      icon: Cake,
      title: `Happy Birthday, ${user?.name || 'Leo'}!`,
      body: 'Wishing you a fantastic day from the Leo Club of Athugalpura! 🎉',
      color: 'text-pink-500 bg-pink-50'
    },
    {
      id: 'event_3d',
      label: 'Event (3 Days)',
      icon: CalendarClock,
      title: 'Upcoming Event',
      body: 'Project "Community Care" is in 3 days! Get ready.',
      color: 'text-blue-500 bg-blue-50'
    },
    {
      id: 'event_1d',
      label: 'Event (Tomorrow)',
      icon: CalendarClock,
      title: 'Event Tomorrow',
      body: 'Reminder: The Monthly Meeting starts tomorrow. See you there!',
      color: 'text-indigo-500 bg-indigo-50'
    },
    {
      id: 'event_today',
      label: 'Event Today',
      icon: Sparkles,
      title: 'Event Today!',
      body: 'The Beach Cleanup is happening today! Don\'t miss it.',
      color: 'text-amber-500 bg-amber-50'
    },
    {
      id: 'cancelled',
      label: 'Cancelled',
      icon: Ban,
      title: 'Event Cancelled',
      body: 'The project "Youth Hike" has been cancelled. Check calendar for details.',
      color: 'text-rose-500 bg-rose-50'
    },
    {
      id: 'task',
      label: 'Task Assigned',
      icon: ClipboardList,
      title: 'New Task Assigned',
      body: 'You have been assigned to: "Design Event Flyer"',
      color: 'text-emerald-500 bg-emerald-50'
    }
  ];

  const applyPreset = (preset: typeof presets[0]) => {
    setTestTitle(preset.title);
    setTestBody(preset.body);
    toast({
        title: "Template Applied",
        description: `Now previewing: ${preset.label}`,
    });
  };

  const handleCopyToken = () => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied", description: "Token copied to clipboard." });
  };

  const handleSendTestPush = async () => {
    if (!token) {
        toast({ title: "Missing Token", description: "Please generate an FCM token first.", variant: "destructive" });
        return;
    }
    
    setIsSending(true);
    const result = await sendTestPushAction(token, testTitle, testBody);
    
    if (result.success) {
        toast({ title: "Notification Sent!", description: "Message successfully dispatched via FCM." });
    } else {
        toast({ title: "Delivery Failed", description: result.error, variant: "destructive" });
    }
    setIsSending(false);
  };

  const getPermissionBadge = () => {
    switch (notificationPermissionStatus) {
        case 'granted': return <Badge className="bg-emerald-600">Granted</Badge>;
        case 'denied': return <Badge variant="destructive">Denied</Badge>;
        default: return <Badge variant="secondary">Not Requested</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold font-headline uppercase tracking-tight">Push Notification Console</h1>
        <p className="text-muted-foreground">Debug and preview real-time member notifications.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
            {/* Step 1: Permissions */}
            <Card className="shadow-lg border-none ring-1 ring-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-primary" /> Step 1: Access
                    </CardTitle>
                </div>
                {getPermissionBadge()}
            </CardHeader>
            <CardContent>
                <Button 
                    onClick={requestPermission} 
                    disabled={notificationPermissionStatus === 'granted'}
                    className="w-full h-11 font-bold"
                >
                    {notificationPermissionStatus === 'granted' ? <CheckCircle className="mr-2 h-4 w-4" /> : <BellRing className="mr-2 h-4 w-4" />}
                    {notificationPermissionStatus === 'granted' ? 'Permissions Active' : 'Request Permissions'}
                </Button>
            </CardContent>
            </Card>

            {/* Step 2: FCM Token */}
            <Card className="shadow-lg border-none ring-1 ring-slate-200">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <QrCode className="h-5 w-5 text-primary" /> Step 2: Device Token
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="relative">
                    <Input 
                        value={token || ''} 
                        readOnly 
                        placeholder="Retrieve token..." 
                        className="pr-10 font-mono text-[10px] h-12 bg-slate-50"
                    />
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-1 top-1 h-10 w-10 text-slate-400"
                        onClick={handleCopyToken}
                        disabled={!token}
                    >
                        {copied ? <ClipboardCheck className="h-4 w-4 text-emerald-600" /> : <Clipboard className="h-4 w-4" />}
                    </Button>
                </div>
                <Button 
                    variant="outline" 
                    className="w-full font-bold" 
                    onClick={() => retrieveToken(true)}
                    disabled={isRetrieving || notificationPermissionStatus !== 'granted'}
                >
                    {isRetrieving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Generate Token
                </Button>
            </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
            {/* Template Presets */}
            <Card className="shadow-lg border-none ring-1 ring-slate-200">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-amber-500" /> Automated Templates
                    </CardTitle>
                    <CardDescription>Click a template to preview its push notification format.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {presets.map((p) => (
                        <button 
                            key={p.id} 
                            onClick={() => applyPreset(p)}
                            className="flex items-center gap-3 p-3 rounded-2xl border bg-white hover:border-primary hover:shadow-md transition-all text-left"
                        >
                            <div className={cn("p-2.5 rounded-xl", p.color)}>
                                <p.icon className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900">{p.label}</p>
                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Template</p>
                            </div>
                        </button>
                    ))}
                </CardContent>
            </Card>

            {/* Step 3: Dispatch */}
            <Card className="shadow-xl border-primary/20 bg-primary/5">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Send className="h-5 w-5 text-primary" /> Step 3: Dispatch Test
                </CardTitle>
                <CardDescription>Send the current template payload to this device.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Title Preview</Label>
                        <Input value={testTitle} onChange={e => setTestTitle(e.target.value)} className="bg-white" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Body Preview</Label>
                        <Input value={testBody} onChange={e => setTestBody(e.target.value)} className="bg-white" />
                    </div>
                </div>
                <Button 
                    className="w-full h-14 text-lg font-black shadow-lg uppercase tracking-tight" 
                    onClick={handleSendTestPush}
                    disabled={!token || isSending}
                >
                    {isSending ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Smartphone className="mr-2 h-6 w-6" />}
                    Send Real Push Now
                </Button>
            </CardContent>
            <CardFooter className="bg-white/50 border-t p-4 flex gap-3 text-[10px] text-slate-500">
                <Info className="h-4 w-4 shrink-0 text-primary" />
                <p>Background notifications (FCM) on <strong>iOS</strong> require the PWA to be "Added to Home Screen" and minimized to the background or locked.</p>
            </CardFooter>
            </Card>
        </div>
      </div>
    </div>
  );
}
