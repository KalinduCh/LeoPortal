// src/hooks/use-fcm.ts
import { useEffect, useState } from 'react';
import { getMessaging, getToken } from 'firebase/messaging';
import { app } from '@/lib/firebase/clientApp';
import type { User } from '@/types';
import { updateFcmToken } from '@/services/userService';
import { useToast } from './use-toast';

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
        // 1. Check if permission is already granted
        if (Notification.permission !== 'granted') {
          console.log("FCM: Notification permission not granted yet.");
          // You can optionally trigger a UI element here to ask the user to enable notifications
          return;
        }
        
        // 2. Get messaging instance
        const messaging = getMessaging(app);

        // 3. Retrieve the token
        try {
          // Use the public VAPID key from your Firebase project settings
          const currentToken = await getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY });
          if (currentToken) {
            console.log('FCM token:', currentToken);
            // 4. Check if token needs to be updated in Firestore
            if (user.fcmToken !== currentToken) {
                console.log("FCM: New or updated token found. Updating in Firestore.");
                await updateFcmToken(user.id, currentToken);
            }
          } else {
            console.log('FCM: No registration token available. Request permission to generate one.');
            // This is where you would show a UI to the user to request permission
          }
        } catch (err) {
          console.error('FCM: An error occurred while retrieving token. ', err);
          toast({
            title: "Could not get notification token",
            description: "There was an issue setting up push notifications. You may need to grant permission.",
            variant: "destructive"
          });
        }
      }
    };

    retrieveToken();
  }, [user, toast]);

  // Function to explicitly request permission
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
      // The useEffect will now pick this up and retrieve the token
      return true;
    } else {
      console.log('FCM: Unable to get permission to notify.');
      toast({ title: "Permission Denied", description: "You will not receive push notifications.", variant: "destructive" });
      return false;
    }
  };

  return { requestPermission, notificationPermissionStatus };
}
