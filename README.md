# LeoPortal - Leo Club Management System

![LeoPortal Logo](https://i.imgur.com/aRktweQ.png)

LeoPortal is a comprehensive, modern web application designed to streamline the management and engagement of Leo Club members. Built with a powerful stack including Next.js, Firebase, and Genkit for AI, it provides a seamless experience for both administrators and members.

## ✨ Key Features

### Member & Club Management
- **Role-Based Access Control**: Separate, feature-rich dashboards for **Admins** and **Members**, with a view-toggle for admins to see the member experience.
- **Authentication**: Secure email & password login and signup flow. New member registrations require admin approval.
- **User Management**:
    - Admins can **approve or reject** pending member applications.
    - Full **CRUD** (Create, Read, Update, Delete) capabilities for user profiles.
    - **Bulk Import**: Admins can import new members from a CSV file.
- **Granular Admin Permissions**: Super Admins can assign specific permissions to other admins, controlling their access to modules like Finance, Members, Events, etc.

### Event & Attendance
- **Event Management**: Admins can create, update, and delete club events, including setting optional start and end times.
- **Smart Attendance Tracking**:
    - Members can mark attendance for **ongoing events only**.
    - Optional **geolocation restriction** requires members to be within a 500-meter radius of the event.
    - **Visitor Attendance**: A dedicated public page allows visiting Leos to mark their attendance for ongoing events.
- **Event Summaries**: View detailed post-event summaries with participant lists (members and visitors).

### Financial Tools
- **Finance Dashboard**: A comprehensive module for tracking club finances.
- **Transaction Logging**: Record income and expenses with categories, dates, and descriptions.
- **Financial Reporting**: View an overview of income vs. expenses with charts and export all transactions to **CSV** or **PDF**.

### Engagement & Communication
- **AI-Powered Communication**: An AI assistant helps admins draft professional and engaging email communications for club members, now with **file attachment support**.
- **Automated Birthday Wishes**: An automated system checks for member birthdays daily and sends a personalized greeting email and push notification.
- **Dynamic Member Profiles**:
    - Members can update their personal information and profile picture.
    - **Achievement Badges** are automatically awarded for participation and leadership roles.
- **PWA & Push Notifications**: Installable app experience with push notifications for new events, approvals, and **24-hour event reminders**.

### Project & Idea Management
- **AI-Powered Project Proposals**: Members can submit a simple project idea, and an AI assistant will generate a complete, structured project proposal based on a club template.
- **Idea Review Workflow**: Admins can review, approve, decline, or request revisions for submitted project proposals.

### Reporting & Integrations
- **Data Export**: Export key data (members, events, attendance, transactions) to **CSV** and **PDF**.
- **Google Sheets Integration**: Automatically syncs member data to a Google Sheet for easy use with other tools like Google Apps Script.

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI**: [React](https://reactjs.org/), [Shadcn/UI](https://ui.shadcn.com/), [Tailwind CSS](https://tailwindcss.com/)
- **Backend & Database**: [Firebase](https://firebase.google.com/) (Authentication, Firestore, Functions)
- **Email**: [Nodemailer](https://nodemailer.com/) (via Firebase Functions and Next.js API Route)
- **AI Integration**: [Google AI & Genkit](https://firebase.google.com/docs/genkit)
- **Forms**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)
- **Styling**: [Lucide React](https://lucide.dev/) for icons

---

## 🚀 Getting Started (Local Development)

Follow these steps to get a local copy running.

### 1. Clone & Install

```sh
git clone https://github.com/your-username/leoportal.git
cd leoportal
npm install
```

### 2. Set up Firebase
- Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com/).
- In your project, go to **Project Settings** -> **General**.
- Click the **Web** icon (</>) to create a new Web App.
- Copy the `firebaseConfig` object and paste it into `src/lib/firebase/clientApp.ts`.
- Go to the **Rules** tab in the **Firestore Database** section, paste the contents of `firestore.rules`, and publish.

### 3. Set up Credentials (`.env` file)
- Create a `.env` file in the root of your project.
- Follow the **Email Setup** and **AI Setup** instructions below to get your credentials.
- Add them to your `.env` file like this:
  ```env
  # For sending emails from the Communication page (via Next.js API route)
  GMAIL_EMAIL=your-email@gmail.com
  GMAIL_APP_PASSWORD=your-16-character-app-password

  # For the AI Content Assistant on the Communication page
  GEMINI_API_KEY=your-google-ai-studio-api-key
  ```

### 4. Run the Development Server
```sh
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to see the result.

### 5. Create Your First Admin User
**Important**: There are no default users. You must create the first user account.
1. Go to the **Signup Page** (`/signup`).
2. Create your first user. This user will have the "member" role and will be in a "pending" state.
3. Go to your **Firebase Console**.
4. Navigate to **Firestore Database**.
5. Find the **"users"** collection and open the document for the user you just created.
6. Change the **`role`** field to **`super_admin`**.
7. Change the **`status`** field to **`approved`**.
8. You can now log in with this user's credentials to access all admin dashboards and manage the application.

---

## 🌐 Deployment (Netlify, Vercel, etc.)

**This is a critical step.** When you deploy your site to a service like Netlify, the `.env` file is **not** used. You must configure the environment variables directly in your hosting provider's dashboard.

### How to Add Environment Variables on Netlify:
1.  Log in to your **Netlify account**.
2.  Go to **Site settings** > **Build & deploy** > **Environment**.
3.  Click **"Edit variables"** and add the following key-value pairs one by one:

    -   **Key**: `GMAIL_EMAIL`
        -   **Value**: `your-email@gmail.com`
    -   **Key**: `GMAIL_APP_PASSWORD`
        -   **Value**: `your-16-character-app-password`
    -   **Key**: `GEMINI_API_KEY`
        -   **Value**: `your-google-ai-studio-api-key`

4.  **Redeploy your site** for the changes to take effect. This will make the variables available to your application, fixing the AI and email features.

---

## 🔑 Credential Setup

### Email Setup (Nodemailer & Gmail)
This application uses a secure backend API route with Nodemailer to send emails.

1.  **Generate a Google App Password**:
    - Go to your Google Account: [myaccount.google.com](https://myaccount.google.com/).
    - Navigate to **Security** and enable **2-Step Verification**.
    - At the bottom, click on **App passwords**.
    - Give the app a name (e.g., "LeoPortal Mailer") and click **Create**.
    - Copy the 16-character password. This is your `GMAIL_APP_PASSWORD`.

2.  **Add to Environment**:
    - For local development, add your Gmail and App Password to the `.env` file.
    - For deployment, add them to your hosting provider's environment variables (see Deployment section).

### AI Setup (Google AI & Genkit)
The AI Content Assistant uses Google's Generative AI.

1.  Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).
2.  Click **"Create API key"** and copy the generated key.
3.  This is your `GEMINI_API_KEY`. Add it to your `.env` file for local development or your hosting provider's settings for deployment.
