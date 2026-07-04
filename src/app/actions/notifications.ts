"use server";

import * as admin from "firebase-admin";

/**
 * Initializes Firebase Admin securely using environment variables for Netlify.
 */
function initAdmin() {
    if (admin.apps.length > 0) return;

    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "leoathugal";

    if (!privateKey || !clientEmail) {
        throw new Error("SERVER_CONFIG_ERROR: FIREBASE_PRIVATE_KEY or FIREBASE_CLIENT_EMAIL is missing.");
    }

    admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
        }),
    });
}

/**
 * Dispatches a push notification to a specific FCM token.
 */
export async function sendPushNotification(token: string, title: string, body: string, link: string = "/dashboard") {
    try {
        initAdmin();
        const message = {
            token: token,
            notification: { title, body },
            webpush: {
                fcmOptions: { link },
                notification: {
                    icon: "https://i.imgur.com/MP1YFNf.png",
                    badge: "https://i.imgur.com/MP1YFNf.png"
                }
            },
        };

        const response = await admin.messaging().send(message);
        return { success: true, messageId: response };
    } catch (error: any) {
        console.error("FCM_DISPATCH_ERROR:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Broadcasts a notification to multiple user IDs.
 */
export async function broadcastToUsers(userIds: string[], title: string, body: string, link: string = "/dashboard") {
    try {
        initAdmin();
        const db = admin.firestore();
        
        // Fetch all tokens for requested users
        const usersSnap = await db.collection("users")
            .where(admin.firestore.FieldPath.documentId(), "in", userIds)
            .get();

        const tokens: string[] = [];
        usersSnap.forEach(doc => {
            const data = doc.data();
            if (data.fcmToken) tokens.push(data.fcmToken);
        });

        if (tokens.length === 0) return { success: true, sentCount: 0 };

        const message = {
            tokens,
            notification: { title, body },
            webpush: {
                fcmOptions: { link },
                notification: { icon: "https://i.imgur.com/MP1YFNf.png" }
            }
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        return { success: true, sentCount: response.successCount, failedCount: response.failureCount };
    } catch (error: any) {
        console.error("BROADCAST_ERROR:", error);
        return { success: false, error: error.message };
    }
}
