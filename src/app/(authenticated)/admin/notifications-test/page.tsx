
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useFcm } from '@/hooks/use-fcm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { sendPushNotification, broadcastToUsers } from '@/app/actions/notifications';
import { getAllUsers } from '@/services/userService';
import type { User } from '@/types';
import { 
  BellRing, ShieldCheck, QrCode, Send, 
  Loader2, Smartphone, CheckCircle, AlertTriangle, 
  Clipboard, ClipboardCheck, Info, RefreshCw, Users, Globe, Sparkles
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function PushControlCenter() {
  const { user } = useAuth();
  const { requestPermission, retrieveToken, notificationPermissionStatus, token, isRetrieving } = useFcm(user);
  const { toast } = useToast();
  
  const [isSending, setIsSending] = useState(false);
  const [testTitle, setTestTitle] = useState('LeoPortal Update');
  const [testBody, setTestBody] = useState('This is a real-time push notification from the admin console.');
  const [copied, setCopied] = useState(false);
  const [activeMembers, setActiveMembers] = useState<User[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
        const users = await getAllUsers();
        setActiveMembers(users.filter(u => u.status === 'approved' && u.fcmToken));
    };
    fetchUsers();
  }, []);

  const handleCopyToken = () => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendSelf = async () => {
    if (!token) return;
    setIsSending(true);
    const result = await sendPushNotification(token, testTitle, testBody);
    if (result.success) toast({ title: "Self-Push Sent!" });
    else toast({ title: "Delivery Failed", description: result.error, variant: "destructive" });
    setIsSending(false);
  };

  const handleBroadcast = async () => {
    const approvedIds = activeMembers.map(u => u.id);
    if (approvedIds.length === 0) {
        toast({ title: "No targets", description: "No active members have registered device tokens." });
        return;
    }

    setIsSending(true);
    const result = await broadcastToUsers(approvedIds, testTitle, testBody);
    if (result.success) {
        toast({ title: "Broadcast Successful", description: `Delivered to ${result.sentCount} devices.` });
    } else {
        toast({ title: "Broadcast Failed", description: result.error, variant: "destructive" });
    }
    setIsSending(false);
  };

  const applyTemplate = (type: 'birthday' | 'event' | 'task') => {
    if (type === 'birthday') {
        setTestTitle('🎉 Happy Birthday!');
        setTestBody(`Wishing you a fantastic day from the Leo Club of Athugalpura!`);
    } else if (type === 'event') {
        setTestTitle('📅 Event Tomorrow');
        setTestBody('Final reminder: Our Monthly Meeting starts tomorrow at 10 AM.');
    } else if (type === 'task') {
        setTestTitle('📋 New Task Assigned');
        setTestBody('You have been assigned to: Design PR Flyer for Charity Gala.');
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-5xl space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
            <h1 className="text-3xl font-black font-headline uppercase tracking-tight">Push Control Center</h1>
            <p className="text-muted-foreground text-sm font-medium">Securely manage and debug PWA notifications.</p>
        </div>
        <Badge variant={notificationPermissionStatus === 'granted' ? 'default' : 'destructive'} className="h-6">
            {notificationPermissionStatus === 'granted' ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
            Status: {notificationPermissionStatus}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="shadow-lg border-primary/10">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> 1. Permissions</CardTitle>
            </CardHeader>
            <CardContent>
                <Button className="w-full font-bold h-11" onClick={requestPermission} disabled={notificationPermissionStatus === 'granted'}>
                    {notificationPermissionStatus === 'granted' ? 'Access Granted' : 'Request Access'}
                </Button>
            </CardContent>
        </Card>

        <Card className="shadow-lg border-primary/10">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><QrCode className="h-5 w-5 text-primary" /> 2. Device Sync</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="relative">
                    <Input value={token || ''} readOnly placeholder="Token pending..." className="pr-10 font-mono text-[10px] h-11" />
                    <Button variant="ghost" size="icon" className="absolute right-1 top-0.5 h-10" onClick={handleCopyToken} disabled={!token}>
                        {copied ? <ClipboardCheck className="h-4 w-4 text-emerald-600" /> : <Clipboard className="h-4 w-4" />}
                    </Button>
                </div>
                <Button variant="outline" className="w-full font-bold h-11" onClick={() => retrieveToken(true)} disabled={isRetrieving || notificationPermissionStatus !== 'granted'}>
                    {isRetrieving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Sync Device
                </Button>
            </CardContent>
        </Card>

        <Card className="shadow-lg border-primary/10 bg-primary/5">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Globe className="h-5 w-5 text-primary" /> Coverage</CardTitle>
            </CardHeader>
            <CardContent className="text-center py-2">
                <p className="text-4xl font-black text-primary">{activeMembers.length}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2">Active FCM Tokens</p>
            </CardContent>
        </Card>
      </div>

      <Separator />

      <Card className="shadow-xl border-2 border-primary/20">
        <CardHeader className="bg-slate-900 text-white p-8">
            <CardTitle className="text-2xl font-black uppercase flex items-center gap-3"><Send className="h-6 w-6 text-primary" /> Dispatch Terminal</CardTitle>
            <CardDescription className="text-slate-400">Configure real-time alerts. Newlines in private keys are handled automatically.</CardDescription>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Alert Headline</Label>
                    <Input value={testTitle} onChange={e => setTestTitle(e.target.value)} className="h-12 text-lg font-bold" />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Alert Body</Label>
                    <Input value={testBody} onChange={e => setTestBody(e.target.value)} className="h-12" />
                </div>
            </div>

            <div className="space-y-3">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Quick Templates</Label>
                <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={() => applyTemplate('birthday')} className="rounded-full">🎂 Birthday</Button>
                    <Button variant="secondary" size="sm" onClick={() => applyTemplate('event')} className="rounded-full">📅 Event Prep</Button>
                    <Button variant="secondary" size="sm" onClick={() => applyTemplate('task')} className="rounded-full">📋 Task Assignment</Button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button 
                    variant="outline"
                    className="h-16 flex-1 text-lg font-black border-2 rounded-2xl"
                    disabled={!token || isSending}
                    onClick={handleSendSelf}
                >
                    <Smartphone className="mr-3 h-6 w-6" /> Push to Self
                </Button>
                <Button 
                    className="h-16 flex-1 text-lg font-black shadow-xl rounded-2xl bg-primary"
                    disabled={activeMembers.length === 0 || isSending}
                    onClick={handleBroadcast}
                >
                    {isSending ? <Loader2 className="mr-3 h-6 w-6 animate-spin" /> : <Users className="mr-3 h-6 w-6" />}
                    Broadcast to All
                </Button>
            </div>
        </CardContent>
        <CardFooter className="bg-slate-50 border-t p-4 flex gap-3 text-[10px] text-slate-500">
            <Info className="h-4 w-4 shrink-0 text-primary" />
            <p>Delivery to iOS requires the app to be added to the Home Screen. Server uses <code>FIREBASE_PRIVATE_KEY</code> with <code>\n</code> replacement.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
