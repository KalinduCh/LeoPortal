"use server";

import * as admin from "firebase-admin";
import { getAdminApp } from "@/lib/firebase/admin/config";

/**
 * Send a push notification to one FCM token.
 */
export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  link: string = "/dashboard"
) {
  try {
    const app = getAdminApp();

    const message: admin.messaging.Message = {
      token,
      notification: {
        title,
        body,
      },
      webpush: {
        fcmOptions: {
          link,
        },
        notification: {
          icon: "https://i.imgur.com/MP1YFNf.png",
          badge: "https://i.imgur.com/MP1YFNf.png",
        },
      },
    };

    const response = await admin.messaging(app).send(message);

    return {
      success: true,
      messageId: response,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown notification error";

    console.error("FCM_DISPATCH_ERROR:", error);

    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Broadcast a notification to multiple users.
 *
 * Firestore "in" queries must be handled in smaller batches,
 * so user IDs are processed in groups of 30.
 */
export async function broadcastToUsers(
  userIds: string[],
  title: string,
  body: string,
  link: string = "/dashboard"
) {
  try {
    const app = getAdminApp();

    if (userIds.length === 0) {
      return {
        success: true,
        sentCount: 0,
        failedCount: 0,
      };
    }

    const db = admin.firestore(app);
    const tokens: string[] = [];

    for (let i = 0; i < userIds.length; i += 30) {
      const batch = userIds.slice(i, i + 30);

      const usersSnap = await db
        .collection("users")
        .where(admin.firestore.FieldPath.documentId(), "in", batch)
        .get();

      usersSnap.forEach((doc) => {
        const data = doc.data();

        if (typeof data.fcmToken === "string" && data.fcmToken.length > 0) {
          tokens.push(data.fcmToken);
        }
      });
    }

    const uniqueTokens = [...new Set(tokens)];

    if (uniqueTokens.length === 0) {
      return {
        success: true,
        sentCount: 0,
        failedCount: 0,
      };
    }

    let sentCount = 0;
    let failedCount = 0;

    // FCM multicast supports up to 500 tokens per request.
    for (let i = 0; i < uniqueTokens.length; i += 500) {
      const tokenBatch = uniqueTokens.slice(i, i + 500);

      const message: admin.messaging.MulticastMessage = {
        tokens: tokenBatch,
        notification: {
          title,
          body,
        },
        webpush: {
          fcmOptions: {
            link,
          },
          notification: {
            icon: "https://i.imgur.com/MP1YFNf.png",
            badge: "https://i.imgur.com/MP1YFNf.png",
          },
        },
      };

      const response = await admin.messaging(app).sendEachForMulticast(message);

      sentCount += response.successCount;
      failedCount += response.failureCount;
    }

    return {
      success: true,
      sentCount,
      failedCount,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown broadcast error";

    console.error("BROADCAST_ERROR:", error);

    return {
      success: false,
      error: message,
    };
  }
}
