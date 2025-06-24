
# Testing LeoPortal Locally

This guide provides instructions on how to test key features of the LeoPortal application, specifically the Progressive Web App (PWA) and Push Notification functionalities, in a local development environment.

## Prerequisites

- You have successfully run `npm install`.
- You have initialized Firebase Functions in your project as per the instructions provided after the push notification feature was added. If not, refer to those instructions first.

## Running the Full Local Environment

To test all features, you need to run two processes simultaneously in separate terminal windows.

**Terminal 1: Start the Next.js Web App**

```bash
npm run dev
```
This starts your application, typically available at `http://localhost:3000`.

**Terminal 2: Start the Firebase Functions Emulator**

```bash
# Navigate to the functions directory from the project root
cd functions

# Start the emulator
firebase emulators:start --only functions
```
This starts a local version of your backend functions. Keep this terminal open to view logs from your functions as they are triggered.

## How to Test PWA Functionality

1.  Open your application in a Chromium-based browser (like Google Chrome) at `http://localhost:3000`.
2.  **Check for Installability**:
    - In the address bar, look for the "Install" icon (a screen with a downward arrow).
    - Clicking this icon should prompt you to install the application on your desktop, confirming it's a valid PWA.
3.  **Verify Manifest & Service Worker**:
    - Open Chrome DevTools (`Ctrl+Shift+I` or `Cmd+Opt+I`).
    - Go to the **Application** tab.
    - In the left pane, under **Manifest**, you can inspect the `manifest.json` file to ensure all details (name, icons, etc.) are correct.
    - Under **Service Workers**, you should see a `firebase-messaging-sw.js` file listed with a status of "activated and is running". This is the script that handles background notifications.

## How to Test Push Notifications

This process tests the full end-to-end flow: granting permission, storing the device token, triggering a backend function, and receiving a notification.

1.  **Grant Notification Permission**:
    - Log into the app on `http://localhost:3000`.
    - After a few seconds of being logged in, a dialog titled "Stay Updated with Notifications" should appear. Click **Allow Notifications**.
    - The browser will then show its native permission prompt at the top of the screen. Click **Allow**.
    - Open the DevTools **Console**. You should see a log message starting with `FCM token:` followed by a long alphanumeric string. This confirms your browser has successfully registered with Firebase Cloud Messaging.

2.  **Trigger a Notification**:
    - While logged in as an **admin**, navigate to the **Event Management** page.
    - Create and save a new event.
    - **Check the Emulator Logs**: Look at the terminal where the Firebase Emulator is running. You should see logs indicating that the `onEventCreated` function was triggered and executed successfully.
    - **Receive the Notification**: A system notification with the title "New Event Published!" should appear on your screen. Clicking it will open or focus the browser tab for the app.

By following these steps, you can thoroughly test and debug the PWA and push notification systems before deploying your application.
