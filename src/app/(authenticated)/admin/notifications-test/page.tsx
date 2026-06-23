
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
  Clipboard, ClipboardCheck, Info
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
    <div className="container mx-auto py-8 max-w-2xl space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold font-headline uppercase tracking-tight">PWA Notification Tester</h1>
        <p className="text-muted-foreground">Follow these steps to verify Firebase Cloud Messaging delivery.</p>
      </div>

      <div className="grid gap-6">
        {/* Step 1: Permissions */}
        <Card className="shadow-lg border-none ring-1 ring-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
                <CardTitle className="text-lg flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" /> Step 1: Permissions
                </CardTitle>
                <CardDescription>Request system notification access.</CardDescription>
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
            {notificationPermissionStatus === 'denied' && (
                <p className="text-xs text-rose-600 mt-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Permission was denied. Please reset permissions in site settings.
                </p>
            )}
          </CardContent>
        </Card>

        {/* Step 2: FCM Token */}
        <Card className="shadow-lg border-none ring-1 ring-slate-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
                <QrCode className="h-5 w-5 text-primary" /> Step 2: FCM Device Token
            </CardTitle>
            <CardDescription>Retrieve the unique identifier for this device.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
                <Input 
                    value={token || ''} 
                    readOnly 
                    placeholder="Token will appear here..." 
                    className="pr-10 font-mono text-xs h-12 bg-slate-50"
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
                Generate / Refresh Token
            </Button>
          </CardContent>
        </Card>

        {/* Step 3: Dispatch */}
        <Card className="shadow-xl border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" /> Step 3: Dispatch Push
            </CardTitle>
            <CardDescription>Send a real test notification to this device.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Title</Label>
                    <Input value={testTitle} onChange={e => setTestTitle(e.target.value)} className="bg-white" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Message Body</Label>
                    <Input value={testBody} onChange={e => setTestBody(e.target.value)} className="bg-white" />
                </div>
            </div>
            <Button 
                className="w-full h-14 text-lg font-black shadow-lg uppercase tracking-tight" 
                onClick={handleSendTestPush}
                disabled={!token || isSending}
            >
                {isSending ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Smartphone className="mr-2 h-6 w-6" />}
                Send Test Notification
            </Button>
          </CardContent>
          <CardFooter className="bg-white/50 border-t p-4 flex gap-3 text-[10px] text-slate-500">
             <Info className="h-4 w-4 shrink-0 text-primary" />
             <p>Note: For <strong>iOS</strong>, push notifications only work if you have "Added to Home Screen". Background notifications require the app to be minimized.</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

import { RefreshCw } from 'lucide-react';
