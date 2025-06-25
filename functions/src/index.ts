import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

/**
 * Sends push notifications to a list of user IDs.
 */
const sendPushToUsers = async (
  userIds: string[],
  title: string,
  body: string,
  link?: string,
) => {
  if (!userIds || userIds.length === 0) {
    console.log("No user IDs provided, skipping notification.");
    return;
  }

  // Get FCM tokens for the user IDs
  const tokens: string[] = [];
  const usersSnapshot = await db.collection("users").where(
    admin.firestore.FieldPath.documentId(),
    "in",
    userIds,
  ).get();

  usersSnapshot.forEach((doc) => {
    const user = doc.data();
    if (user.fcmToken) {
      tokens.push(user.fcmToken);
    }
  });

  if (tokens.length === 0) {
    console.log("No valid FCM tokens found for the users.");
    return;
  }

  const message: admin.messaging.MulticastMessage = {
    tokens,
    notification: {
      title,
      body,
    },
    webpush: {
      fcmOptions: {
        link: link || "https://leoathugal.web.app/dashboard",
      },
      notification: {
        icon: "https://i.imgur.com/MP1YFNf.png",
      },
    },
  };

  try {
    const response = await messaging.sendEachForMulticast(message);
    console.log("Successfully sent message:", response);
    if (response.failureCount > 0) {
      console.warn("Failed to send to some tokens:", response.responses);
    }
  } catch (error) {
    console.error("Error sending message:", error);
  }
};

// --- TRIGGER FUNCTIONS ---

// 1. Notify user when their account is approved
export const onUserApproved = functions.firestore
  .document("users/{userId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.status === "pending" && after.status === "approved") {
      const userId = context.params.userId;
      await sendPushToUsers(
        [userId],
        "Account Approved!",
        `Welcome, ${after.name}! Your account has been approved. You can now log in.`,
        "/dashboard",
      );
    }
  });

// 2. Notify all approved members when a new event is created
export const onEventCreated = functions.firestore
  .document("events/{eventId}")
  .onCreate(async (snap, context) => {
    const event = snap.data();
    const usersSnapshot = await db.collection("users")
      .where("status", "==", "approved").get();
    
    const userIds = usersSnapshot.docs.map((doc) => doc.id);

    await sendPushToUsers(
      userIds,
      "New Event Published!",
      `A new event has been scheduled: ${event.name}`,
      `/dashboard`, 
    );
  });
