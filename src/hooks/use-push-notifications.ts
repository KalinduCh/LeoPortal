
// src/hooks/use-push-notifications.ts
import { useState, useEffect, useCallback } from 'react';
import { updatePushSubscription } from '@/services/userService';
import type { User } from '@/types';

const VAPID_PUBLIC_KEY = "BIc9bH71DzSMqmg3pBlve0gm14FLcVAh4EacFVw4Ovg4uEd3k11ETlLIimkEinqQgObmFoOLWdKb4ZKCN1Nn-oM";

/**
 * Hook to manage standard Web Push subscriptions.
 * Optimized for iOS 16.4+ PWAs with robust feature detection.
 */
export function usePushNotifications(user: User | null) {
  const [permission, setPermission] = useState<NotificationPermission | 'default'>('default');
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeUser = useCallback(async () => {
    if (typeof window === 'undefined' || !user || !('serviceWorker' in navigator) || !('Notification' in window)) {
        console.warn('Push notifications are not supported in this environment.');
        return false;
    }

    setIsSubscribing(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        throw new Error('Permission not granted for notifications');
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const subscribeOptions = {
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        };
        subscription = await registration.pushManager.subscribe(subscribeOptions);
      }

      const subscriptionJson = subscription.toJSON();
      await updatePushSubscription(user.id, subscriptionJson);
      
      console.log('Successfully subscribed to Web Push:', subscriptionJson);
      return true;
    } catch (error) {
      console.error('Failed to subscribe user:', error);
      return false;
    } finally {
      setIsSubscribing(false);
    }
  }, [user]);

  const isIosPwaEligible = useCallback(() => {
    if (typeof window === 'undefined') return false;
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    return isIos && !isStandalone;
  }, []);

  return {
    permission,
    isSubscribing,
    subscribeUser,
    isIosPwaEligible: isIosPwaEligible()
  };
}
