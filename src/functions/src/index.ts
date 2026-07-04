
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { google } from "googleapis";
import * as nodemailer from "nodemailer";

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

const GMAIL_EMAIL = "athugalpuraleoclub306d9@gmail.com";
const GMAIL_APP_PASSWORD = "osng xjdz lhwu movh";

/**
 * Shared helper to dispatch pushes to multiple user IDs.
 */
const sendPushToUsers = async (userIds: string[], title: string, body: string, link: string = "/dashboard") => {
  if (userIds.length === 0) return;

  const usersSnap = await db.collection("users")
    .where(admin.firestore.FieldPath.documentId(), "in", userIds.slice(0, 500))
    .get();

  const tokens: string[] = [];
  usersSnap.forEach(doc => {
    const data = doc.data();
    if (data.fcmToken) tokens.push(data.fcmToken);
  });

  if (tokens.length === 0) return;

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
    // Cleanup invalid tokens if necessary
  } catch (error) {
    console.error("PUSH_DISPATCH_FAILURE:", error);
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
    await sendPushToUsers(userIds, "New Event Published!", `Join us for ${event.name}! Check the portal for details.`);
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
    await sendPushToUsers(userIds, "Event Cancelled", `The event "${event.name}" has been removed from the calendar.`);
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
 * Scheduled birthday wishes (Runs daily at 9 AM Colombo).
 */
export const sendBirthdayWishes = functions.pubsub.schedule("0 9 * * *")
  .timeZone("Asia/Colombo")
  .onRun(async () => {
    const today = new Date();
    const todayStr = today.toISOString().slice(5, 10); // MM-DD
    
    const usersSnap = await db.collection("users").where("status", "==", "approved").get();
    
    for (const doc of usersSnap.docs) {
        const user = doc.data();
        if (user.dateOfBirth && user.dateOfBirth.includes(todayStr)) {
            await sendPushToUsers([doc.id], `🎉 Happy Birthday, ${user.name}!`, "Wishing you a fantastic day from the Leo Club of Athugalpura!");
        }
    }
  });

/**
 * Scheduled event reminders (Runs daily at 8 AM Colombo).
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
                await sendPushToUsers(allUserIds, "Upcoming Event", `${event.name} is happening in 3 days!`, "/calendar");
            } else if (diffDays === 1) {
                await sendPushToUsers(allUserIds, "Final Reminder", `${event.name} starts tomorrow. See you there!`, "/calendar");
            } else if (diffDays === 0 && startDate.toDateString() === now.toDateString()) {
                await sendPushToUsers(allUserIds, "Event is Today!", `${event.name} starts today! Don't forget to mark attendance.`, "/calendar");
            }
        }
    });
