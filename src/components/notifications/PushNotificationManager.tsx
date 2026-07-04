"use client";

import { useEffect, useState, useCallback } from 'react';
import { getToken } from 'firebase/messaging';
import { messaging } from '@/lib/firebase/clientApp';
import { useAuth } from '@/hooks/use-auth';
import { updateFcmToken } from '@/services/userService';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || "BIc9bH71DzSMqmg3pBlve0gm14FLcVAh4EacFVw4Ovg4uEd3k11ETlLIimkEinqQgObmFoOLWdKb4ZKCN1Nn-oM";

export function PushNotificationManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isTokenUpdating, setIsTokenUpdating] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const subscribeToNotifications = useCallback(async () => {
    if (!messaging || !user) return;

    try {
      setIsTokenUpdating(true);
      const status = await Notification.requestPermission();
      setPermission(status);

      if (status === 'granted') {
        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
        });

        if (token) {
          await updateFcmToken(user.id, token);
          toast({
            title: "Notifications Enabled",
            description: "You will now receive push notifications.",
          });
        }
      }
    } catch (error) {
      console.error("Error subscribing to notifications:", error);
      toast({
        title: "Subscription Failed",
        description: "Failed to enable notifications. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsTokenUpdating(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user && permission === 'granted' && messaging) {
      // Refresh token if needed
      const refreshToken = async () => {
        try {
          const token = await getToken(messaging, {
            vapidKey: VAPID_KEY,
          });
          if (token && token !== user.fcmToken) {
            await updateFcmToken(user.id, token);
          }
        } catch (error) {
          console.error("Error refreshing FCM token:", error);
        }
      };
      refreshToken();
    }
  }, [user, permission]);

  if (!user || typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {permission !== 'granted' ? (
        <Button
          onClick={subscribeToNotifications}
          disabled={isTokenUpdating}
          className="rounded-full shadow-lg"
          size="icon"
        >
          <Bell className="h-5 w-5" />
        </Button>
      ) : (
        <Button
          variant="outline"
          className="rounded-full shadow-lg bg-white dark:bg-gray-800"
          size="icon"
          onClick={() => {
            toast({
              title: "Notifications Active",
              description: "You are already subscribed to notifications.",
            });
          }}
        >
          <Bell className="h-5 w-5 text-green-500" />
        </Button>
      )}
    </div>
  );
}
