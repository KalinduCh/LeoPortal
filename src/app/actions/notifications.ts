
"use server";

import * as admin from "firebase-admin";

/**
 * Server action to send a test notification to a specific FCM token.
 * Uses environment variables for secure authentication on hosting platforms like Netlify.
 */
export async function sendTestPushAction(token: string, title: string, body: string) {
  try {
    // Initialize Firebase Admin using environment variables
    if (!admin.apps.length) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "leoathugal";

      if (!privateKey || !clientEmail) {
        console.error("FCM Delivery Error: Missing server-side environment variables (FIREBASE_PRIVATE_KEY or FIREBASE_CLIENT_EMAIL).");
        return { success: false, error: "Server-side configuration error: Missing credentials." };
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }

    const message = {
      token: token,
      notification: {
        title: title,
        body: body,
      },
      webpush: {
        fcmOptions: {
          link: "/dashboard",
        },
        notification: {
          icon: "https://i.imgur.com/MP1YFNf.png",
          badge: "https://i.imgur.com/MP1YFNf.png",
        }
      },
    };

    const response = await admin.messaging().send(message);
    return { success: true, messageId: response };
  } catch (error: any) {
    console.error("FCM Delivery Error:", error);
    return { success: false, error: error.message };
  }
}
