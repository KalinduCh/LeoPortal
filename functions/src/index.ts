
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { google } from "googleapis";
import * as nodemailer from "nodemailer";
// Note: In some environments, importing from ../../src/types may require specific tsconfig paths.
// We use 'any' or local definitions for robustness within the function environment if needed.

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

const GMAIL_EMAIL = "athugalpuraleoclub306d9@gmail.com";
const GMAIL_APP_PASSWORD = "osng xjdz lhwu movh";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: GMAIL_EMAIL,
        pass: GMAIL_APP_PASSWORD,
    },
});

const createEmailHtml = (bodyContent: string) => {
    return `
      <div style="font-family: 'PT Sans', Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="padding: 25px; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
              <div style="padding: 25px;">
                ${bodyContent}
              </div>
              <div style="border-top: 1px solid #e5e7eb; padding: 20px 25px; background-color: #f9fafb;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td valign="top">
                      <p style="margin: 0; font-weight: bold; font-size: 15px; color: #1e3a8a;">LEO CLUB OF ATHUGALPURA</p>
                      <p style="margin: 5px 0 0 0; font-size: 12px; color: #555555;">Leo District 306 D9 | Sri Lanka</p>
                      <p style="margin: 5px 0 0 0; font-size: 11px; color: #777777;">Leostic Year 2025/26</p>
                      <p style="margin-top: 15px;">
                          <a href="https://www.facebook.com/leoclubofathugalpura/" target="_blank" style="text-decoration: none; margin-right: 12px;">
                              <img src="https://i.postimg.cc/0QtH6Bn7/image.png" alt="Facebook" width="24" height="24">
                          </a>
                          <a href="https://www.instagram.com/athugalpuraleos/" target="_blank" style="text-decoration: none; margin-right: 12px;">
                              <img src="https://i.postimg.cc/RZLrSGkP/image.png" alt="Instagram" width="24" height="24">
                          </a>
                          <a href="https://www.youtube.com/channel/UCe23x0ATwC2rIqA5RKWuF6w" target="_blank" style="text-decoration: none; margin-right: 12px;">
                              <img src="https://i.postimg.cc/CMBWBw32/image.png" alt="YouTube" width="24" height="24">
                          </a>
                          <a href="https://www.tiktok.com/@athugalpuraleos" target="_blank" style="text-decoration: none;">
                              <img src="https://i.postimg.cc/hjJ3d05k/image.png" alt="TikTok" width="24" height="24">
                          </a>
                      </p>
                    </td>
                    <td align="right" valign="top" style="width: 70px;">
                      <img src="https://i.postimg.cc/4xDKG4TV/Navy-Blue-Minimal-Professional-Linked-In-Profile-Picture.png" alt="Leo Club Logo" width="60" style="width: 60px; height: auto; border-radius: 50%;" data-ai-hint="club logo">
                    </td>
                  </tr>
                </table>
              </div>
          </div>
        </div>
      </div>
    `;
};


/**
 * Sends a transactional email.
 */
const sendEmail = async (to: string, subject: string, htmlBody: string) => {
    const fullHtml = createEmailHtml(htmlBody);
    const mailOptions = {
        from: `"LEO CLUB OF ATHUGALPURA" <${GMAIL_EMAIL}>`,
        to,
        subject,
        html: fullHtml,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${to} with subject: ${subject}`);
    } catch (error) {
        console.error(`Failed to send email to ${to}:`, error);
    }
};

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
  } catch (error) {
    console.error("Error sending message:", error);
  }
};


export const onUserStatusChange = functions.firestore
  .document("users/{userId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const userId = context.params.userId;

    if (before.status === "pending" && after.status === "approved") {
      const userEmail = after.email;
      const userName = after.name || "Leo";

      await sendPushToUsers(
        [userId],
        "Account Approved!",
        `Welcome, ${userName}! Your account has been approved. You can now log in.`,
        "/dashboard",
      );

      const subject = "Your LEO Portal Account has been Approved!";
      const htmlBody = `
        <p>Dear ${userName},</p>
        <p>Congratulations! Your membership for the LEO Portal has been approved by an administrator.</p>
        <p>You can now log in to your account to view upcoming events, track your participation, and connect with other members.</p>
        <p>Welcome to the club!</p>
      `;
      if (userEmail) {
        await sendEmail(userEmail, subject, htmlBody);
      }
    }
    
    if (before.status === "pending" && after.status === "rejected") {
        const userEmail = after.email;
        const userName = after.name || "Leo";
        const subject = "Update on Your LEO Portal Registration";
        const htmlBody = `<p>Dear ${userName},</p><p>Thank you for your interest in joining the LEO Portal. After careful review, we regret to inform you that your registration could not be approved at this time.</p>`;
        if (userEmail) await sendEmail(userEmail, subject, htmlBody);
        await db.collection("users").doc(userId).delete();
    }
  });


export const onEventCreated = functions.firestore
  .document("events/{eventId}")
  .onCreate(async (snap) => {
    const event = snap.data();
    const usersSnapshot = await db.collection("users").where("status", "==", "approved").get();
    const userIds = usersSnapshot.docs.map((doc) => doc.id);
    await sendPushToUsers(userIds, "New Event Published!", `A new event has been scheduled: ${event.name}`, `/dashboard`);
  });

export const onEventDeleted = functions.firestore
  .document("events/{eventId}")
  .onDelete(async (snap) => {
    const event = snap.data();
    const usersSnapshot = await db.collection("users").where("status", "==", "approved").get();
    const userIds = usersSnapshot.docs.map((doc) => doc.id);
    await sendPushToUsers(userIds, "Event Cancelled", `The event "${event.name}" has been cancelled. Please check the calendar for updates.`, "/calendar");
  });

export const onTaskCreated = functions.firestore
  .document("tasks/{taskId}")
  .onCreate(async (snap) => {
    const task = snap.data();
    if (task.assigneeIds && task.assigneeIds.length > 0) {
      await sendPushToUsers(task.assigneeIds, "New Task Assigned", `You have been assigned to: ${task.title}`, `/tasks/${snap.id}`);
    }
  });

export const sendBirthdayWishes = functions.pubsub.schedule("0 9 * * *")
  .timeZone("Asia/Colombo")
  .onRun(async () => {
    const today = new Date();
    const todayStr = `${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    
    const usersSnapshot = await db.collection("users").where("status", "==", "approved").get();
    
    const birthdayUserIds: string[] = [];
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.dateOfBirth && data.dateOfBirth.includes(todayStr)) {
        birthdayUserIds.push(doc.id);
      }
    });

    if (birthdayUserIds.length > 0) {
      for (const userId of birthdayUserIds) {
        const user = usersSnapshot.docs.find(d => d.id === userId)?.data();
        await sendPushToUsers([userId], `Happy Birthday, ${user?.name}!`, "Wishing you a fantastic day from the Leo Club of Athugalpura! 🎉", "/profile");
      }
    }
  });

export const sendEventReminders = functions.pubsub.schedule("0 8 * * *")
    .timeZone("Asia/Colombo")
    .onRun(async () => {
        const now = new Date();
        const usersSnapshot = await db.collection("users").where("status", "==", "approved").get();
        const allUserIds = usersSnapshot.docs.map(doc => doc.id);

        const eventsSnapshot = await db.collection("events").get();
        
        for (const doc of eventsSnapshot.docs) {
            const event = doc.data();
            if (!event.startDate) continue;
            
            const startDate = new Date(event.startDate);
            const diffDays = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays === 3) {
                await sendPushToUsers(allUserIds, "Upcoming Event", `${event.name} is in 3 days! Get ready.`, "/dashboard");
            } else if (diffDays === 1) {
                await sendPushToUsers(allUserIds, "Event Tomorrow", `Reminder: ${event.name} starts tomorrow. See you there!`, "/dashboard");
            } else if (diffDays === 0 && startDate.toDateString() === now.toDateString()) {
                await sendPushToUsers(allUserIds, "Event Today!", `${event.name} is happening today! Don't miss it.`, "/dashboard");
            }
        }
    });

export const sendMonthlyReports = functions.pubsub.schedule("0 9 1 * *")
    .timeZone("Asia/Colombo")
    .onRun(async () => {
        const adminsSnapshot = await db.collection("users").where("role", "in", ["admin", "super_admin"]).get();
        const adminEmails = adminsSnapshot.docs.map((doc) => doc.data().email).filter(Boolean);
        for (const email of adminEmails) {
            await sendEmail(email, "Monthly Portal Report Ready", "<p>Your monthly summary report is now available in the portal dashboard.</p>");
        }
    });

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
    const userId = context.params.userId;
    if (!change.after.exists) return;
    const userData = change.after.data();
    if (!userData) return;

    const values = [userId, userData.name || "", userData.email || "", userData.role || "member", new Date().toISOString()];
    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: "Sheet1!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [values] },
    });
  });
