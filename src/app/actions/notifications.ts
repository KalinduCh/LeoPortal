
"use server";

import * as admin from "firebase-admin";

/**
 * Server action to send a test notification to a specific FCM token.
 * Uses environment variables (FIREBASE_PRIVATE_KEY and FIREBASE_CLIENT_EMAIL) 
 * for secure authentication on hosting platforms like Netlify.
 */
export async function sendTestPushAction(token: string, title: string, body: string) {
  try {
    // Initialize Firebase Admin using environment variables if not already initialized
    if (!admin.apps.length) {
      // Netlify often mangles newlines in environment variables, so we restore them
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "leoathugal";

      // Validate that the required credentials for the Admin SDK are present
      if (!privateKey || !clientEmail) {
        const missing = [];
        if (!privateKey) missing.push("FIREBASE_PRIVATE_KEY");
        if (!clientEmail) missing.push("FIREBASE_CLIENT_EMAIL");
        
        console.error(`FCM Configuration Error: Missing ${missing.join(" and ")}`);
        return { 
          success: false, 
          error: `Server-side configuration error: Missing ${missing.join(" and ")}.` 
        };
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
    // Provide a descriptive error message from the Firebase SDK if delivery fails
    return { success: false, error: error.message || "Failed to deliver notification." };
  }
}
