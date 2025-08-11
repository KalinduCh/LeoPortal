# LeoPortal - Leo Club Management System

![LeoPortal Logo](https://i.imgur.com/aRktweQ.png)

LeoPortal is a comprehensive, modern web application designed to streamline the management and engagement of Leo Club members. Built with a powerful stack including Next.js, Firebase, and Genkit for AI, it provides a seamless experience for both administrators and members.

## ✨ Key Features

- **Role-Based Access Control**: Separate, feature-rich dashboards for **Admins** and **Members**.
- **Authentication**: Secure email & password login and signup flow. New member registrations require admin approval.
- **Event Management**: Admins can create, update, and delete club events, including setting optional start and end times.
- **Smart Attendance Tracking**:
    - Members can mark attendance for **ongoing events only**.
    - Optional **geolocation restriction** requires members to be within a 500-meter radius of the event.
    - **Visitor Attendance**: A dedicated public page allows visiting Leos to mark their attendance for ongoing events, also with optional geolocation.
- **User Management**:
    - Admins can **approve or reject** pending member applications.
    - Full **CRUD** (Create, Read, Update, Delete) capabilities for user profiles.
    - **Bulk Import**: Admins can import new members from a CSV file.
- **AI-Powered Communication**: An AI assistant helps admins draft professional and engaging email communications for club members.
- **Automated Email System**: Emails for announcements and birthday wishes are sent via a secure backend function using **Nodemailer**.
- **Reporting & Data Export**:
    - Admins can view detailed **event summaries** with participant lists.
    - Reports on member participation and club growth.
    - Export key data (members, events, attendance) to **CSV** and **PDF**.
- **Dynamic Member Profiles**:
    - Members can update their personal information and profile picture.
    - **Achievement Badges** are automatically awarded for participation and leadership roles.
- **Modern UI/UX**:
    - Clean, responsive design built with Shadcn/UI and Tailwind CSS.
    - Light and Dark mode support.
    - Intuitive navigation and user-friendly forms.
- **PWA & Push Notifications**: Installable app experience with push notifications for new events and approvals.
- **Google Sheets Integration**: Automatically syncs member data to a Google Sheet for easy use with other tools like Google Apps Script.

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI**: [React](https://reactjs.org/), [Shadcn/UI](https://ui.shadcn.com/), [Tailwind CSS](https://tailwindcss.com/)
- **Backend & Database**: [Firebase](https://firebase.google.com/) (Authentication, Firestore, Functions)
- **Email**: [Nodemailer](https://nodemailer.com/) (via Firebase Functions)
- **AI Integration**: [Google AI & Genkit](https://firebase.google.com/docs/genkit)
- **Forms**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)
- **Styling**: [Lucide React](https://lucide.dev/) for icons

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

- Node.js (v18 or later)
- npm or yarn
- A Google account (e.g., Gmail) to be used for sending emails.

### Installation

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/your-username/leoportal.git
    cd leoportal
    ```

2.  **Install Root NPM packages:**
    ```sh
    npm install
    ```

3.  **Install Functions NPM packages:**
    ```sh
    cd functions
    npm install
    cd ..
    ```

4.  **Set up Backend Email Credentials:**
    - Follow the instructions in the **Email Setup (Nodemailer)** section below to configure your backend email service.

5.  **Set up Firebase Security Rules:**
    - Go to your Firebase project console.
    - Navigate to **Firestore Database** -> **Rules**.
    - Copy the contents of `firestore.rules` from this repository and paste them into the editor.
    - Click **Publish**.

6.  **Deploy Firebase Functions (Required for Email & Notifications):**
    - Follow the instructions in `TESTING.md` to set up and deploy the backend functions.

7.  **Run the development server:**
    - To run the full local environment (web app and functions), see `TESTING.md`.
    - To just run the web app:
      ```sh
      npm run dev
      ```
    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 📧 Email Setup (Nodemailer)

This application uses a secure backend Firebase Function with **Nodemailer** to send emails. This is more secure and reliable than sending from the client.

### Step 1: Create a Gmail App Password

Using a dedicated "App Password" is more secure than using your main Google account password.

1.  Go to your Google Account settings: [myaccount.google.com](https://myaccount.google.com/).
2.  Navigate to the **Security** tab.
3.  Make sure **2-Step Verification** is turned **ON**. You cannot create App Passwords without it.
4.  In the "Signing in to Google" section, click on **App passwords**.
5.  Under "Select app," choose **Mail**.
6.  Under "Select device," choose **Other (Custom name)** and give it a name like "LeoPortal App".
7.  Click **Generate**.
8.  Google will display a **16-character password**. **Copy this password immediately.** This is your `GMAIL_APP_PASSWORD`. You won't see it again.

### Step 2: Set Firebase Function Secrets

You must store your credentials securely as Firebase Function secrets. **Do not put them in `.env` files.**

1.  Make sure you are logged into the Firebase CLI (`firebase login`).
2.  Navigate to your project's root directory in your terminal.
3.  Run the following commands, one by one, replacing the placeholder values with your actual Gmail email and the App Password you just generated:

    ```sh
    firebase functions:secrets:set GMAIL_EMAIL
    ```
    You will be prompted to enter your full Gmail address (e.g., `your-email@gmail.com`).

    ```sh
    firebase functions:secrets:set GMAIL_APP_PASSWORD
    ```
    You will be prompted to paste the 16-character App Password you copied from Google.

4.  After setting the secrets, you need to grant your function access to them. Open `functions/src/index.ts` and ensure the `sendEmail` function definition includes the secrets:

    ```typescript
    export const sendEmail = functions
      .runWith({ secrets: ["GMAIL_EMAIL", "GMAIL_APP_PASSWORD"] })
      .https.onRequest((request, response) => {
        // ... function code
      });
    ```
    *Note: The provided code changes already do this, but it's good practice to verify.*

5.  **Deploy your functions** for the secrets to take effect:
    ```sh
    firebase deploy --only functions
    ```

Your email system is now fully configured and secure.

---

## 📄 License

Distributed under the MIT License.
