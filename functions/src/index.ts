
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";
import type { Task } from "../../types";

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

// Use environment variables for sensitive credentials
const GMAIL_EMAIL = process.env.GMAIL_EMAIL || "athugalpuraleoclub306d9@gmail.com";
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || "osng xjdz lhwu movh";

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
                    </td>
                    <td align="right" valign="top" style="width: 70px;">
                      <img src="https://i.imgur.com/MP1YFNf.png" alt="Leo Club Logo" width="60" style="width: 60px; height: auto; border-radius: 50%;">
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
        console.error("Missing Gmail environment variables.");
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
    console.log("Push notifications status:", response);
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
  .onCreate(async (snap) => {
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
    
    // Notify only if new assignees are added
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
