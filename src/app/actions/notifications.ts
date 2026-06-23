
"use server";

import * as admin from "firebase-admin";

/**
 * Server action to send a test notification to a specific FCM token.
 */
export async function sendTestPushAction(token: string, title: string, body: string) {
  try {
    // Check if Firebase Admin is already initialized
    if (!admin.apps.length) {
      // Ensure the service_key.json is present in the root or accessible path
      admin.initializeApp({
        credential: admin.credential.cert(require("../../../service_key.json")),
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
