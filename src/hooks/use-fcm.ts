
// src/hooks/use-fcm.ts
import { useEffect, useState } from 'react';
import { getMessaging, getToken } from 'firebase/messaging';
import { app } from '@/lib/firebase/clientApp';
import type { User } from '@/types';
import { updateFcmToken } from '@/services/userService';
import { useToast } from './use-toast';

// VAPID key from Firebase Console
const VAPID_KEY = "BIc9bH71DzSMqmg3pBlve0gm14FLcVAh4EacFVw4Ovg4uEd3k11ETlLIimkEinqQgObmFoOLWdKb4ZKCN1Nn-oM";

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
        // 1. Check if the VAPID key has been set by the developer
        if (!VAPID_KEY || VAPID_KEY === "PASTE_YOUR_FIREBASE_VAPID_KEY_HERE") {
            console.error("FCM Error: VAPID key is not set. Please paste your key into `src/hooks/use-fcm.ts`.");
            // This toast is a fallback, but we should not hit it now.
            toast({
                title: "Push Notification Setup Error",
                description: "VAPID key is missing from configuration.",
                variant: "destructive",
                duration: 15000
            });
            return;
        }

        // 2. Check if permission is already granted
        if (Notification.permission !== 'granted') {
          console.log("FCM: Notification permission not granted yet.");
          return;
        }
        
        // 3. Get messaging instance
        const messaging = getMessaging(app);

        // 4. Retrieve the token
        try {
          const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
          if (currentToken) {
            console.log('FCM token:', currentToken);
            // 5. Check if token needs to be updated in Firestore
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

    retrieveToken();
  }, [user, toast]);

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
