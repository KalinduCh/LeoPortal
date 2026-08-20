
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
    const fullHtml = createEmailHtml(htmlBody);
    const mailOptions = {
        from: `"LEO CLUB OF ATHUGALPURA" <${GMAIL_EMAIL}>`,
        to,
        subject,
        html: fullHtml,
    };
    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error(`Failed to send email to ${to}:`, error);
    }
};

const sendPushToUsers = async (userIds: string[], title: string, body: string, link: string = "/dashboard") => {
  if (userIds.length === 0) return;
  const chunks = [];
  for (let i = 0; i < userIds.length; i += 500) {
    chunks.push(userIds.slice(i, i + 500));
  }
  for (const chunk of chunks) {
    const usersSnap = await db.collection("users").where(admin.firestore.FieldPath.documentId(), "in", chunk).get();
    const tokens: string[] = [];
    usersSnap.forEach(doc => {
      if (doc.data().fcmToken) tokens.push(doc.data().fcmToken);
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
      await messaging.sendEachForMulticast(message);
    } catch (error) {
      console.error("PUSH_DISPATCH_FAILURE:", error);
    }
  }
};

export const onUserStatusChange = functions.firestore
  .document("users/{userId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const userId = context.params.userId;
    if (before.status === "pending" && after.status === "approved") {
      await sendPushToUsers([userId], "Account Approved!", `Welcome, ${after.name}! Your account has been approved.`, "/dashboard");
      await sendEmail(after.email, "Account Approved", `<p>Dear ${after.name}, your LEO Portal account is approved.</p>`);
    }
    if (before.status === "pending" && after.status === "rejected") {
      await sendEmail(after.email, "Registration Update", `<p>Dear ${after.name}, your registration could not be approved.</p>`);
      await db.collection("users").doc(userId).delete();
    }
  });

export const onEventCreated = functions.firestore
  .document("events/{eventId}")
  .onCreate(async (snap) => {
    const event = snap.data();
    const approvedUsers = await db.collection("users").where("status", "==", "approved").get();
    const userIds = approvedUsers.docs.map(d => d.id);
    await sendPushToUsers(userIds, "New Event Published!", `Join us for ${event.name}!`, "/calendar");
  });

export const onEventDeleted = functions.firestore
  .document("events/{eventId}")
  .onDelete(async (snap) => {
    const event = snap.data();
    const approvedUsers = await db.collection("users").where("status", "==", "approved").get();
    const userIds = approvedUsers.docs.map(d => d.id);
    await sendPushToUsers(userIds, "Event Cancelled", `"${event.name}" has been removed.`, "/calendar");
  });

export const onTaskCreated = functions.firestore
  .document("tasks/{taskId}")
  .onCreate(async (snap) => {
    const task = snap.data();
    if (task.assigneeIds?.length > 0) {
        await sendPushToUsers(task.assigneeIds, "New Task Assigned", `Assigned: ${task.title}`, `/tasks/${snap.id}`);
    }
  });

export const sendBirthdayWishes = functions.pubsub.schedule("0 9 * * *")
  .timeZone("Asia/Colombo")
  .onRun(async () => {
    const todayStr = new Date().toISOString().slice(5, 10);
    const usersSnap = await db.collection("users").where("status", "==", "approved").get();
    for (const doc of usersSnap.docs) {
        const user = doc.data();
        if (user.dateOfBirth?.includes(todayStr)) {
            await sendPushToUsers([doc.id], `Happy Birthday, ${user.name}!`, "Best wishes from Leo Club of Athugalpura! 🎉", "/profile");
        }
    }
  });

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
            const diffDays = Math.ceil((new Date(event.startDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays === 3 || diffDays === 1 || (diffDays === 0 && new Date(event.startDate).toDateString() === now.toDateString())) {
                await sendPushToUsers(allUserIds, "Event Reminder", `${event.name} is coming up!`, "/calendar");
            }
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

export const annualMembershipFeeReset = functions.pubsub.schedule("0 0 1 6 *")
  .timeZone("Asia/Colombo")
  .onRun(async () => {
    const usersSnapshot = await db.collection("users").get();
    const batch = db.batch();
    usersSnapshot.forEach(doc => {
      batch.update(doc.ref, { membershipFeeStatus: 'pending', membershipFeeAmountPaid: 0 });
    });
    await batch.commit();
  });
