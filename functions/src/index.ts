import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { google } from "googleapis";
import axios from "axios";
import * as nodemailer from "nodemailer";
import * as cors from "cors";

const corsHandler = cors({ origin: true });

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

// --- Nodemailer Transport ---
// For this to work, you must create an "App Password" for your Gmail account.
// See the updated README.md for instructions.
// Store these as secrets in your Firebase project:
// firebase functions:secrets:set GMAIL_EMAIL
// firebase functions:secrets:set GMAIL_APP_PASSWORD
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_EMAIL,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

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

// --- HTTP CALLABLE FUNCTIONS ---

/**
 * Sends an email to a list of recipients using Nodemailer.
 */
export const sendEmail = functions.https.onRequest((request, response) => {
  corsHandler(request, response, async () => {
    if (request.method !== "POST") {
      response.status(405).send("Method Not Allowed");
      return;
    }

    const { recipients, subject, body } = request.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      response.status(400).send({ success: false, message: "No recipients specified." });
      return;
    }
    if (!subject || !body) {
      response.status(400).send({ success: false, message: "Subject and body are required." });
      return;
    }

    const bcc = recipients.map((r: { email: string }) => r.email).join(", ");

    const mailOptions = {
      from: `LEO Portal Admin <${process.env.GMAIL_EMAIL}>`,
      bcc: bcc, // Use BCC to protect recipient privacy
      subject: subject,
      html: `<p>Dear LEO Member,</p>${body}<p>Sincerely,<br/>The LEO Portal Team</p>`,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${recipients.length} recipients.`);
      response.status(200).send({ success: true, message: "Emails sent successfully!" });
    } catch (error: any) {
      console.error("Error sending email with Nodemailer:", error);
      response.status(500).send({ success: false, message: `Failed to send emails: ${error.message}` });
    }
  });
});


// --- TRIGGER FUNCTIONS ---

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

const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID;
const EMAILJS_BIRTHDAY_TEMPLATE_ID = process.env.EMAILJS_BIRTHDAY_TEMPLATE_ID;
const EMAILJS_USER_ID = process.env.EMAILJS_USER_ID;

export const dailyBirthdayCheck = functions.pubsub
  .schedule("every day 08:00")
  .timeZone("Asia/Colombo")
  .onRun(async (context) => {
    console.log("Running daily birthday check...");

    if (!EMAILJS_SERVICE_ID || !EMAILJS_BIRTHDAY_TEMPLATE_ID || !EMAILJS_USER_ID) {
      console.error("EmailJS credentials for birthday emails are not set. Exiting function.");
      return null;
    }

    const today = new Date();
    const currentDay = String(today.getDate()).padStart(2, "0");
    const currentMonth = String(today.getMonth() + 1).padStart(2, "0");
    const todayMMDD = `${currentMonth}-${currentDay}`;

    const usersSnapshot = await db.collection("users")
      .where("status", "==", "approved")
      .get();

    if (usersSnapshot.empty) {
      console.log("No approved users found.");
      return null;
    }

    const birthdayUsers = usersSnapshot.docs.filter((doc) => {
      const user = doc.data();
      if (user.dateOfBirth && typeof user.dateOfBirth === "string") {
        // DOB is expected in "YYYY-MM-DD" format
        const dobMMDD = user.dateOfBirth.substring(5);
        return dobMMDD === todayMMDD;
      }
      return false;
    });

    if (birthdayUsers.length === 0) {
      console.log("No members have birthdays today.");
      return null;
    }

    console.log(`Found ${birthdayUsers.length} user(s) with birthdays today.`);

    const emailPromises = birthdayUsers.map(async (doc) => {
      const user = doc.data();
      const emailParams = {
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_BIRTHDAY_TEMPLATE_ID,
        user_id: EMAILJS_USER_ID,
        template_params: {
          to_name: user.name,
          to_email: user.email,
        },
      };

      try {
        await axios.post("https://api.emailjs.com/api/v1.0/email/send", emailParams);
        console.log(`Birthday email sent to ${user.email}`);
      } catch (error: any) {
        console.error(`Failed to send birthday email to ${user.email}:`, error.response ? error.response.data : error.message);
      }
    });

    await Promise.all(emailPromises);
    console.log("Finished sending all birthday emails.");
    return null;
  });
