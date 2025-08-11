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
- **Backend Email System**: The admin "Communication" page uses a secure **Next.js API Route** and **Nodemailer** to send emails, keeping credentials safe on the server.
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
- **Email**: [Nodemailer](https://nodemailer.com/) (via Next.js API Route)
- **AI Integration**: [Google AI & Genkit](https://firebase.google.com/docs/genkit)
- **Forms**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)
- **Styling**: [Lucide React](https://lucide.dev/) for icons

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

- Node.js (v18 or later)
- npm or yarn
- A Google Account (e.g., Gmail)

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

4.  **Set up Email Credentials:**
    - Follow the instructions in the **Email Setup (Nodemailer & Gmail)** section below to configure your email service.

5.  **Set up Firebase Security Rules:**
    - Go to your Firebase project console.
    - Navigate to **Firestore Database** -> **Rules**.
    - Copy the contents of `firestore.rules` from this repository and paste them into the editor.
    - Click **Publish**.

6.  **Deploy Firebase Functions (Required for Notifications & DB Triggers):**
    - Follow the instructions in `TESTING.md` to set up and deploy the backend functions.

7.  **Run the development server:**
    - To run the full local environment (web app and functions), see `TESTING.md`.
    - To just run the web app:
      ```sh
      npm run dev
      ```
    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 📧 Email Setup (Nodemailer & Gmail)

This application uses a secure backend API route with **Nodemailer** to send emails from the server. This method is more robust and secure than client-side sending.

### Step 1: Generate a Google App Password

To send emails securely through your Gmail account, you need to generate an **App Password**. This is a 16-digit code that gives an app permission to access your Google Account.

1.  Go to your **Google Account**: [myaccount.google.com](https://myaccount.google.com/).
2.  Navigate to the **Security** tab.
3.  Under "How you sign in to Google," click on **2-Step Verification**. You must have 2-Step Verification enabled to create App Passwords. If it's not enabled, follow the on-screen steps to set it up.
4.  At the bottom of the 2-Step Verification page, click on **App passwords**.
5.  When prompted, give the app a name (e.g., "LeoPortal Mailer") and click **Create**.
6.  Google will generate a **16-character password**. Copy this password immediately. **This is your `GMAIL_APP_PASSWORD`**.

### Step 2: Configure Environment Variables

1.  In the root of your project, open the `.env` file.
2.  Add your Gmail email and the App Password you just generated, replacing the placeholder values with your own:

    ```env
    GMAIL_EMAIL=your-email@gmail.com
    GMAIL_APP_PASSWORD=your-16-character-app-password
    ```

After restarting your development server (`npm run dev`), the Communication page will be fully configured to send emails using your Gmail account.

---

## 📄 License

Distributed under the MIT License.
