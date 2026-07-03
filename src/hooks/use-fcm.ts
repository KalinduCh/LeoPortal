
// src/hooks/use-fcm.ts
import { useEffect, useState, useCallback } from 'react';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { app } from '@/lib/firebase/clientApp';
import type { User } from '@/types';
import { updateFcmToken } from '@/services/userService';
import { useToast } from './use-toast';

// This is your Web Push Certificate Public Key from Firebase Console
// Now fetched dynamically from your environment variables
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || "BIc9bH71DzSMqmg3pBlve0gm14FLcVAh4EacFVw4Ovg4uEd3k11ETlLIimkEinqQgObmFoOLWdKb4ZKCN1Nn-oM";

export function useFcm(user: User | null) {
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [isRetrieving, setIsRetrieving] = useState(false);
  const [notificationPermissionStatus, setNotificationPermissionStatus] = useState<NotificationPermission | 'default'>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermissionStatus(Notification.permission);
    }
  }, []);

  const retrieveToken = useCallback(async (manualRequest = false) => {
    if (typeof window === 'undefined' || !user || !('serviceWorker' in navigator) || !('Notification' in window)) {
        if (manualRequest) toast({ title: "Unsupported", description: "This browser does not support push notifications.", variant: "destructive" });
        return null;
    }

    setIsRetrieving(true);
    try {
      const supported = await isSupported();
      if (!supported) throw new Error("FCM is not supported in this environment.");

      // Ensure the service worker is registered and ready
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/'
      });
      
      // Wait for the service worker to be active
      await navigator.serviceWorker.ready;
      
      const messaging = getMessaging(app);
      const currentToken = await getToken(messaging, { 
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration
      });

      if (currentToken) {
        setToken(currentToken);
        if (user.fcmToken !== currentToken) {
            await updateFcmToken(user.id, currentToken);
        }
        if (manualRequest) toast({ title: "Token Generated", description: "FCM token retrieved and stored successfully." });
        return currentToken;
      } else {
        throw new Error("No registration token available. Request permission to generate one.");
      }
    } catch (err: any) {
      console.warn('FCM: Token retrieval failed. ', err);
      if (manualRequest) toast({ title: "FCM Error", description: err.message, variant: "destructive" });
      return null;
    } finally {
      setIsRetrieving(false);
    }
  }, [user, toast]);

  // Auto-retrieve if permission is already granted
  useEffect(() => {
    if (user && notificationPermissionStatus === 'granted' && !token) {
      retrieveToken(false);
    }
  }, [user, notificationPermissionStatus, retrieveToken, token]);

  const requestPermission = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    
    try {
        const permission = await Notification.requestPermission();
        setNotificationPermissionStatus(permission);

        if (permission === 'granted') {
          await retrieveToken(true);
          return true;
        } else {
          toast({ title: "Permission Denied", description: "Please enable notifications in site settings.", variant: "destructive" });
          return false;
        }
    } catch (error: any) {
        console.error("Error requesting notification permission:", error);
        toast({ title: "Permission Error", description: error.message, variant: "destructive" });
        return false;
    }
  };

  return { requestPermission, retrieveToken, notificationPermissionStatus, token, isRetrieving };
}
