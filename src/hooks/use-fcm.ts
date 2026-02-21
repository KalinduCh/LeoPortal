// src/hooks/use-fcm.ts
import { useEffect, useState } from 'react';
import { getMessaging, getToken } from 'firebase/messaging';
import { app } from '@/lib/firebase/clientApp';
import type { User } from '@/types';
import { updateFcmToken } from '@/services/userService';
import { useToast } from './use-toast';

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
      if (typeof window === 'undefined' || !user || !('serviceWorker' in navigator)) return;

      try {
        const registration = await navigator.serviceWorker.ready;
        if (!registration.active) {
            console.log("FCM: Service worker is not active yet.");
            return;
        }

        if (Notification.permission !== 'granted') return;
        
        const messaging = getMessaging(app);
        const currentToken = await getToken(messaging, { 
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration
        });

        if (currentToken) {
          console.log('FCM token:', currentToken);
          if (user.fcmToken !== currentToken) {
              await updateFcmToken(user.id, currentToken);
          }
        }
      } catch (err) {
        console.error('FCM: Token retrieval failed. ', err);
      }
    };

    retrieveToken();
  }, [user]);

  const requestPermission = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    
    const permission = await Notification.requestPermission();
    setNotificationPermissionStatus(permission);

    if (permission === 'granted') {
      return true;
    } else {
      toast({ title: "Permission Denied", description: "You will not receive push notifications." });
      return false;
    }
  };

  return { requestPermission, notificationPermissionStatus };
}