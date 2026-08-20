
import { useEffect, useState, useCallback } from 'react';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { app } from '@/lib/firebase/clientApp';
import type { User } from '@/types';
import { updateFcmToken } from '@/services/userService';
import { useToast } from './use-toast';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || "BIc9bH71DzSMqmg3pBlve0gm14FLcVAh4EacFVw4Ovg4uEd3k11ETlLIimkEinqQgObmFoOLWdKb4ZKCN1Nn-oM";

export function useFcm(user: User | null) {
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [isRetrieving, setIsRetrieving] = useState(false);
  const [notificationPermissionStatus, setNotificationPermissionStatus] = useState<NotificationPermission | 'default'>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) setNotificationPermissionStatus(Notification.permission);
  }, []);

  const retrieveToken = useCallback(async (manualRequest = false) => {
    if (typeof window === 'undefined' || !user || !('serviceWorker' in navigator) || !('Notification' in window)) {
        if (manualRequest) toast({ title: "Unsupported", variant: "destructive" });
        return null;
    }
    setIsRetrieving(true);
    try {
      const supported = await isSupported();
      if (!supported) throw new Error("FCM not supported.");
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      const messaging = getMessaging(app);
      const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
      if (currentToken) {
        setToken(currentToken);
        if (user.fcmToken !== currentToken) await updateFcmToken(user.id, currentToken);
        return currentToken;
      }
      throw new Error("No token.");
    } catch (err: any) {
      if (manualRequest) toast({ title: "FCM Error", description: err.message, variant: "destructive" });
      return null;
    } finally {
      setIsRetrieving(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user && notificationPermissionStatus === 'granted' && !token) retrieveToken(false);
  }, [user, notificationPermissionStatus, retrieveToken, token]);

  const requestPermission = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    try {
        const permission = await Notification.requestPermission();
        setNotificationPermissionStatus(permission);
        if (permission === 'granted') { await retrieveToken(true); return true; }
        return false;
    } catch (error: any) {
        return false;
    }
  };

  return { requestPermission, retrieveToken, notificationPermissionStatus, token, isRetrieving };
}
