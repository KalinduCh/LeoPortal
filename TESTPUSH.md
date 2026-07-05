# 🚀 LeoPortal Push Notification System

This document outlines the implementation, architecture, and security protocols of the Firebase Cloud Messaging (FCM) based push notification system in LeoPortal.

## 🏗️ Architecture
The system uses a hybrid architecture involving client-side service workers, Firestore for persistence, and the Firebase Admin SDK for secure delivery.

### 1. Client-Side (Frontend)
- **Service Worker (`public/firebase-messaging-sw.js`)**: A background thread that listens for push events even when the browser is closed or the PWA is minimized. It uses the Firebase Compat SDK for broad browser support.
- **Onboarding Hook (`src/hooks/use-fcm.ts`)**: 
    - Automatically requests browser permissions via a friendly `AlertDialog` in the main layout.
    - Generates a unique **FCM Device Token** using your project's VAPID key.
    - Synchronizes the token with the user's Firestore profile under the `fcmToken` field.
- **PWA Manifest (`public/manifest.json`)**: Configured with `gcm_sender_id: "103953800507"` (a mandatory FCM constant) to enable the Web Push protocol.

### 2. Server-Side (Secure Dispatch)
- **Server Action (`src/app/actions/notifications.ts`)**: 
    - Uses `firebase-admin` to communicate with Google's messaging servers.
    - **Security**: Never exposes private keys to the client. It pulls credentials from environment variables (`FIREBASE_PRIVATE_KEY` and `FIREBASE_CLIENT_EMAIL`).
    - **Formatting**: Handles the conversion of string-based private keys with newline characters (`.replace(/\\n/g, '\n')`) to ensure compatibility with Netlify.

### 3. Automated Backend (Triggers)
- **Firebase Functions (`functions/src/index.ts`)**: 
    - **OnEventCreated**: Dispatches a broadcast to all approved members when a new event is added.
    - **Birthday Wish**: A scheduled daily cron job (9:00 AM) that checks user profiles for matching birth dates and sends personalized greetings.
    - **Event Reminders**: A scheduled daily job (8:00 AM) that calculates proximity to event start dates and triggers alerts at 3 days, 1 day, and 0 days (morning of).

## 🛠️ Technology Stack
- **Firebase Cloud Messaging (FCM)**: The transport layer for messages.
- **Web Push API**: The standard browser interface for receiving pushes.
- **Firebase Admin SDK**: For authorized message dispatching.
- **Next.js Server Actions**: For secure, RPC-like server-side execution.
- **Service Workers**: For background task execution.

## 📱 Platform Specifics

### Android & Desktop (Chrome/Edge/Firefox)
- Works natively as soon as the user grants permission. 
- Notifications appear as system toasts/banners.

### iOS (Safari PWA)
- **Requirements**: iOS 16.4+ is required.
- **Installation**: The user **must** use the "Add to Home Screen" feature. Push notifications do *not* work in standard Safari tabs.
- **Activation**: Once installed as a PWA, the permission prompt will behave exactly like a native app.

## 🔐 Environment Configuration (Netlify)
To enable the system in production, the following keys must be set in the deployment environment:

| Variable | Source | Purpose |
| :--- | :--- | :--- |
| `FIREBASE_PRIVATE_KEY` | Service Account JSON | RSA Private key for Admin Auth. |
| `FIREBASE_CLIENT_EMAIL` | Service Account JSON | Identity of the dispatcher. |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Firebase Console | Public certificate for Web Push. |

---
© 2026 Leo Club of Athugalpura Tech Team.
