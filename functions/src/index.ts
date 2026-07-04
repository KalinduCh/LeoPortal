import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { google } from "googleapis";
import * as nodemailer from "nodemailer";

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

const GMAIL_EMAIL = "athugalpuraleoclub306d9@gmail.com";
const GMAIL_APP_PASSWORD = "osng xjdz lhwu movh";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_EMAIL, pass: GMAIL_APP_PASSWORD },
});

/**
 * Robust multicast push dispatcher with error cleaning.
 */
const sendPushToUsers = async (userIds: string[], title: string, body: string, link: string = "/dashboard") => {
  if (userIds.length === 0) return;

  // Split userIds into chunks of 500 for Firestore "in" query
  const chunks = [];
  for (let i = 0; i < userIds.length; i += 500) {
    chunks.push(userIds.slice(i, i + 500));
  }

  for (const chunk of chunks) {
    const usersSnap = await db.collection("users")
      .where(admin.firestore.FieldPath.documentId(), "in", chunk)
      .get();

    const tokens: string[] = [];
    const tokenToUserIdMap: { [token: string]: string } = {};

    usersSnap.forEach(doc => {
      const data = doc.data();
      if (data.fcmToken) {
        tokens.push(data.fcmToken);
        tokenToUserIdMap[data.fcmToken] = doc.id;
      }
    });

    if (tokens.length === 0) continue;

    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: { title, body },
      webpush: {
        fcmOptions: { link },
        notification: { icon: "https://i.imgur.com/MP1YFNf.png" },
      },
    };

    try {
      const response = await messaging.sendEachForMulticast(message);

      // Cleanup invalid tokens
      const tokensToRemove: Promise<any>[] = [];
      response.responses.forEach((resp, idx) => {
          if (!resp.success && (resp.error?.code === 'messaging/invalid-registration-token' || resp.error?.code === 'messaging/registration-token-not-registered')) {
              const token = tokens[idx];
              const userId = tokenToUserIdMap[token];
              if (userId) {
                  tokensToRemove.push(db.collection("users").doc(userId).update({ fcmToken: admin.firestore.FieldValue.delete() }));
              }
          }
      });
      await Promise.all(tokensToRemove);
    } catch (error) {
      console.error("PUSH_DISPATCH_FAILURE:", error);
    }
  }
};

/**
 * Triggers when a new event is published.
 */
export const onEventCreated = functions.firestore
  .document("events/{eventId}")
  .onCreate(async (snap) => {
    const event = snap.data();
    const approvedUsers = await db.collection("users").where("status", "==", "approved").get();
    const userIds = approvedUsers.docs.map(d => d.id);
    await sendPushToUsers(userIds, "New Event Published!", `Join us for ${event.name}! Check the portal for details.`, "/calendar");
  });

/**
 * Triggers when an event is cancelled.
 */
export const onEventDeleted = functions.firestore
  .document("events/{eventId}")
  .onDelete(async (snap) => {
    const event = snap.data();
    const approvedUsers = await db.collection("users").where("status", "==", "approved").get();
    const userIds = approvedUsers.docs.map(d => d.id);
    await sendPushToUsers(userIds, "Event Cancelled", `The event "${event.name}" has been removed from the calendar.`, "/calendar");
  });

/**
 * Triggers when a task is assigned.
 */
export const onTaskCreated = functions.firestore
  .document("tasks/{taskId}")
  .onCreate(async (snap) => {
    const task = snap.data();
    if (task.assigneeIds?.length > 0) {
        await sendPushToUsers(task.assigneeIds, "New Task Assigned", `You have been assigned to: ${task.title}`, `/tasks/${snap.id}`);
    }
  });

/**
 * Scheduled birthday bot (Runs 9 AM Colombo Time).
 */
export const sendBirthdayWishes = functions.pubsub.schedule("0 9 * * *")
  .timeZone("Asia/Colombo")
  .onRun(async () => {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayMMDD = `${mm}-${dd}`;
    
    const usersSnap = await db.collection("users").where("status", "==", "approved").get();
    
    for (const doc of usersSnap.docs) {
        const user = doc.data();
        // Assuming dateOfBirth is stored as YYYY-MM-DD or MM-DD
        if (user.dateOfBirth && user.dateOfBirth.includes(todayMMDD)) {
            await sendPushToUsers([doc.id], `Happy Birthday, ${user.name}!`, "Wishing you a fantastic day from the Leo Club of Athugalpura! 🎉", "/profile");
        }
    }
  });

/**
 * Scheduled event reminders (Runs 8 AM Colombo Time).
 */
export const sendEventReminders = functions.pubsub.schedule("0 8 * * *")
    .timeZone("Asia/Colombo")
    .onRun(async () => {
        const now = new Date();
        const eventsSnap = await db.collection("events").get();
        const approvedUsers = await db.collection("users").where("status", "==", "approved").get();
        const allUserIds = approvedUsers.docs.map(d => d.id);

        for (const doc of eventsSnap.docs) {
            const event = doc.data();
            if (!event.startDate) continue;
            
            const startDate = new Date(event.startDate);
            const diffDays = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays === 3) {
                await sendPushToUsers(allUserIds, "Upcoming Event", `${event.name} is in 3 days! Get ready.`, "/calendar");
            } else if (diffDays === 1) {
                await sendPushToUsers(allUserIds, "Event Tomorrow", `Final reminder: ${event.name} starts tomorrow!`, "/calendar");
            } else if (diffDays === 0 && startDate.toDateString() === now.toDateString()) {
                await sendPushToUsers(allUserIds, "Event Today!", `${event.name} is happening today. Don't miss out!`, "/calendar");
            }
        }
    });

/**
 * Syncs user profiles to Google Sheets.
 */
export const onUserDocumentChanged = functions.firestore
  .document("users/{userId}")
  .onWrite(async (change, context) => {
    const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
    const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (!GOOGLE_SHEET_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) return;

    const auth = new google.auth.GoogleAuth({
      credentials: { client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key: GOOGLE_PRIVATE_KEY },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const sheets = google.sheets({ version: "v4", auth });
    
    if (!change.after.exists) return;
    const userData = change.after.data();
    if (!userData) return;

    const values = [context.params.userId, userData.name || "", userData.email || "", userData.role || "member", new Date().toISOString()];
    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: "Sheet1!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [values] },
    });
  });
