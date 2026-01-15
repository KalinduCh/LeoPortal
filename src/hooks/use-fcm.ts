// src/hooks/use-fcm.ts
import { useEffect, useState } from 'react';
import { getMessaging, getToken } from 'firebase/messaging';
import { app } from '@/lib/firebase/clientApp';
import type { User } from '@/types';
import { updateFcmToken } from '@/services/userService';
import { useToast } from './use-toast';

// VAPID key from Firebase Console
const VAPID_KEY = "BIc9bH71DzSMqmg3pBlve0gm14FLcVAh4EacFVw4Ovg4uEd3k11ETlLIimkEinqQgObmFoOLWdKb4ZKCN1Nn-oM";

async function getServiceWorkerRegistration() {
    if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration.active) {
            return registration;
        }
    }
    return null;
}


export function useFcm(user: User | null) {
  const { toast } = useToast();
  const [notificationPermissionStatus, setNotificationPermissionStatus] = useState<NotificationPermission | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermissionStatus(Notification.permission);
    }
  }, []);

  useEffect(() => {
    const retrieveToken = async () => {
      if (typeof window !== 'undefined' && user) {
        if (Notification.permission !== 'granted') {
          console.log("FCM: Notification permission not granted yet.");
          return;
        }

        const registration = await getServiceWorkerRegistration();
        if (!registration) {
            console.error("FCM: No active service worker found. Cannot get token.");
            toast({
              title: "Push Notification Error",
              description: "Could not find an active service worker. Notifications may not work.",
              variant: "destructive"
            });
            return;
        }
        
        const messaging = getMessaging(app);

        try {
          const currentToken = await getToken(messaging, { 
              vapidKey: VAPID_KEY,
              serviceWorkerRegistration: registration 
          });

          if (currentToken) {
            console.log('FCM token:', currentToken);
            if (user.fcmToken !== currentToken) {
                console.log("FCM: New or updated token found. Updating in Firestore.");
                await updateFcmToken(user.id, currentToken);
            }
          } else {
            console.log('FCM: No registration token available. Request permission to generate one.');
          }
        } catch (err) {
          console.error('FCM: An error occurred while retrieving token. ', err);
          toast({
            title: "Could not get notification token",
            description: "There was an issue setting up push notifications. You may need to re-grant permission or check your browser settings.",
            variant: "destructive"
          });
        }
      }
    };

    if (notificationPermissionStatus === 'granted') {
      retrieveToken();
    }
  }, [user, toast, notificationPermissionStatus]);

  const requestPermission = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        toast({ title: "Notifications not supported", description: "Your browser does not support push notifications.", variant: "destructive" });
        return false;
    }
    
    console.log('FCM: Requesting notification permission...');
    const permission = await Notification.requestPermission();
    setNotificationPermissionStatus(permission);

    if (permission === 'granted') {
      console.log('FCM: Notification permission granted.');
      return true;
    } else {
      console.log('FCM: Unable to get permission to notify.');
      toast({ title: "Permission Denied", description: "You will not receive push notifications." });
      return false;
    }
  };

  return { requestPermission, notificationPermissionStatus };
}
