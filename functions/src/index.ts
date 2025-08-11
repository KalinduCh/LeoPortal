import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { google } from "googleapis";

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

export const onUserDocumentChanged = functions.firestore
  .document("users/{userId}")
  .onWrite(async (change, context) => {
    const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
    const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!GOOGLE_SHEET_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
      console.log("Google Sheets environment variables not set. Skipping sync.");
      return;
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: GOOGLE_PRIVATE_KEY,
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const userId = context.params.userId;

    // If document is deleted
    if (!change.after.exists) {
      console.log(`User ${userId} deleted. Removing from Google Sheet.`);
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: "Sheet1!A:A",
      });
      const rows = response.data.values;
      if (rows) {
        const rowIndex = rows.findIndex((row) => row[0] === userId);
        if (rowIndex !== -1) {
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId: GOOGLE_SHEET_ID,
            requestBody: {
              requests: [{
                deleteDimension: {
                  range: {
                    sheetId: 0,
                    dimension: "ROWS",
                    startIndex: rowIndex,
                    endIndex: rowIndex + 1,
                  },
                },
              }],
            },
          });
          console.log(`Row for user ${userId} deleted from Google Sheet.`);
        }
      }
      return;
    }

    const userData = change.after.data();
    if (!userData) {
      console.log("No user data found after change.");
      return;
    }

    const values = [
      userId,
      userData.name || "",
      userData.email || "",
      userData.designation || "",
      userData.nic || "",
      userData.dateOfBirth || "",
      userData.gender || "",
      userData.mobileNumber || "",
      userData.role || "member",
      userData.status || "pending",
      new Date().toISOString(),
    ];

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: "Sheet1!A:A",
    });

    const rows = response.data.values;
    let rowIndex = -1;
    if (rows) {
      rowIndex = rows.findIndex((row) => row[0] === userId);
    }

    if (rowIndex !== -1) {
      // Update existing row
      console.log(`Updating row for user ${userId} in Google Sheet.`);
      await sheets.spreadsheets.values.update({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: `Sheet1!A${rowIndex + 1}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [values] },
      });
    } else {
      // Append new row
      console.log(`Appending new row for user ${userId} to Google Sheet.`);
      await sheets.spreadsheets.values.append({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: "Sheet1!A1",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [values] },
      });
    }
  });
