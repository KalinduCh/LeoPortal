import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { google } from "googleapis";
import * as nodemailer from "nodemailer";
import type { Event, Task, PointsEntry } from "../../types";

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

const GMAIL_EMAIL = process.env.GMAIL_EMAIL;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

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

const sendEmail = async (to: string, subject: string, htmlBody: string) => {
    if (!GMAIL_EMAIL || !GMAIL_APP_PASSWORD) {
        console.error("GMAIL_EMAIL or GMAIL_APP_PASSWORD not set in environment variables.");
        return;
    }
    const fullHtml = createEmailHtml(htmlBody);
    const mailOptions = {
        from: `"LEO CLUB OF ATHUGALPURA" <${GMAIL_EMAIL}>`,
        to,
        subject,
        html: fullHtml,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${to}`);
    } catch (error) {
        console.error(`Failed to send email to ${to}:`, error);
    }
};

const sendPushToUsers = async (
  userIds: string[],
  title: string,
  body: string,
  link?: string,
) => {
  if (!userIds || userIds.length === 0) return;

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

  if (tokens.length === 0) return;

  const message: admin.messaging.MulticastMessage = {
    tokens,
    notification: { title, body },
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
    console.log("Successfully sent push notifications:", response);
  } catch (error) {
    console.error("Error sending push notifications:", error);
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
        `Welcome, ${userName}! Your account has been approved.`,
        "/dashboard",
      );

      const subject = "Your LEO Portal Account has been Approved!";
      const htmlBody = `
        <p>Dear ${userName},</p>
        <p>Congratulations! Your membership for the LEO Portal has been approved.</p>
        <p>Welcome to the club!</p>
      `;
      if (userEmail) {
        await sendEmail(userEmail, subject, htmlBody);
      }
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

export const onTaskCreated = functions.firestore
  .document("tasks/{taskId}")
  .onCreate(async (snap, context) => {
    const task = snap.data() as Task;
    if (task.assigneeIds && task.assigneeIds.length > 0) {
      await sendPushToUsers(
        task.assigneeIds,
        "New Task Assigned!",
        `You have been assigned to: ${task.title}`,
        `/tasks/${context.params.taskId}`
      );
    }
  });

export const onTaskUpdated = functions.firestore
  .document("tasks/{taskId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data() as Task;
    const after = change.after.data() as Task;
    
    const newAssignees = after.assigneeIds.filter(id => !before.assigneeIds.includes(id));
    
    if (newAssignees.length > 0) {
      await sendPushToUsers(
        newAssignees,
        "New Task Assigned!",
        `You have been assigned to: ${after.title}`,
        `/tasks/${context.params.taskId}`
      );
    }
  });
