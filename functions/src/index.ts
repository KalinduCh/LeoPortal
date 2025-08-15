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
                              <img src="https://i.imgur.com/J1yVxxH.png" alt="Facebook" width="24" height="24">
                          </a>
                          <a href="https://www.instagram.com/athugalpuraleos/" target="_blank" style="text-decoration: none; margin-right: 12px;">
                              <img src="https://i.imgur.com/x4p4kU7.png" alt="Instagram" width="24" height="24">
                          </a>
                          <a href="https://www.youtube.com/channel/UCe23x0ATwC2rIqA5RKWuF6w" target="_blank" style="text-decoration: none; margin-right: 12px;">
                              <img src="https://i.imgur.com/3YQd8M2.png" alt="YouTube" width="24" height="24">
                          </a>
                          <a href="https://www.tiktok.com/@athugalpuraleos" target="_blank" style="text-decoration: none;">
                              <img src="https://i.imgur.com/DUEsV4Q.png" alt="TikTok" width="24" height="24">
                          </a>
                      </p>
                    </td>
                    <td align="right" valign="top" style="width: 70px;">
                      <img src="https://i.imgur.com/MP1YFNf.png" alt="Leo Club Logo" width="60" style="width: 60px; height: auto;" data-ai-hint="club logo">
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
    if (response.failureCount > 0) {
      console.warn("Failed to send to some tokens:", response.responses);
    }
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

    // Check if status changed from 'pending' to 'approved'
    if (before.status === "pending" && after.status === "approved") {
      const userEmail = after.email;
      const userName = after.name || "Leo";

      // Send Push Notification
      await sendPushToUsers(
        [userId],
        "Account Approved!",
        `Welcome, ${userName}! Your account has been approved. You can now log in.`,
        "/dashboard",
      );

      // Send Email
      const subject = "Your LEO Portal Account has been Approved!";
      const htmlBody = `
        <p>Dear ${userName},</p>
        <p>Congratulations! Your membership for the LEO Portal has been approved by an administrator.</p>
        <p>You can now log in to your account to view upcoming events, track your participation, and connect with other members.</p>
        <p>Welcome to the club!</p>
        <p>Best Regards,<br>Leo Club Of Athugalpura</p>
      `;
      if (userEmail) {
        await sendEmail(userEmail, subject, htmlBody);
      }
    }
    
    // Check if status changed from 'pending' to 'rejected'
    if (before.status === "pending" && after.status === "rejected") {
        const userEmail = after.email;
        const userName = after.name || "Leo";
        
        const subject = "Update on Your LEO Portal Registration";
        const htmlBody = `
            <p>Dear ${userName},</p>
            <p>Thank you for your interest in joining the LEO Portal.</p>
            <p>After careful review, we regret to inform you that your registration could not be approved at this time. If you believe this is a mistake or wish to inquire further, please contact a club administrator.</p>
            <p>We appreciate your understanding.</p>
            <p>Best Regards,<br>Leo Club Of Athugalpura</p>
        `;
        if (userEmail) {
            await sendEmail(userEmail, subject, htmlBody);
        }

        // After sending email, delete the user document
        await db.collection("users").doc(userId).delete();
        console.log(`Rejected user ${userId} document deleted after sending email.`);
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
    