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
- **Client-Side Email System**: The admin "Communication" page uses **EmailJS** to send emails directly from the browser, ideal for free-tier hosting plans.
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
- **Email**: [EmailJS](https://www.emailjs.com/) (Client-side sending)
- **AI Integration**: [Google AI & Genkit](https://firebase.google.com/docs/genkit)
- **Forms**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)
- **Styling**: [Lucide React](https://lucide.dev/) for icons

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

- Node.js (v18 or later)
- npm or yarn
- An EmailJS account ([Sign up for free](https://www.emailjs.com/))

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

4.  **Set up EmailJS Credentials:**
    - Follow the instructions in the **Email Setup (EmailJS)** section below to configure your email service.

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

## 📧 Email Setup (EmailJS)

This application uses **EmailJS** to send emails directly from the Admin Communication page in the browser. This method is free and does not require a paid Firebase plan.

### Step 1: Get Your EmailJS Credentials

1.  Sign in to your [EmailJS account](https://www.emailjs.com/).
2.  Add an email service (e.g., Gmail). EmailJS will guide you through the connection process.
3.  Find your **Service ID** on the "Email Services" page.
4.  Find your **Public Key** in your account settings under the "Account" section.

### Step 2: Create the Email Template

1.  Go to the **Email Templates** section in your EmailJS dashboard.
2.  Click **Create New Template**.
3.  Set the **Subject** line to: `{{subject}}`
4.  Switch to the "Code" editor view for the template body.
5.  **Delete all existing content** and paste the **exact content** from the file located at: `src/lib/email-templates/default-notification.html` in this project.
    - This template includes all the required dynamic variables like `{{to_name}}`, `{{body_content}}`, etc.
6.  Save the template and copy its **Template ID**.

### Step 3: Configure Environment Variables

1.  In the root of your project, open the `.env` file (or create it if it doesn't exist).
2.  Add your EmailJS credentials like this, replacing the placeholder values with your own:

    ```env
    EMAILJS_SERVICE_ID=YOUR_SERVICE_ID
    EMAILJS_TEMPLATE_ID=YOUR_TEMPLATE_ID
    EMAILJS_PUBLIC_KEY=YOUR_PUBLIC_KEY
    ```

After restarting your development server (`npm run dev`), the Communication page will be fully configured to send emails.

---

## 📄 License

Distributed under the MIT License.
