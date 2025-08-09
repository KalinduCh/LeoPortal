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
- **AI-Powered Communication**: An AI assistant helps admins draft professional and engaging email communications for club members, sent via **EmailJS**.
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

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI**: [React](https://reactjs.org/), [Shadcn/UI](https://ui.shadcn.com/), [Tailwind CSS](https://tailwindcss.com/)
- **Backend & Database**: [Firebase](https://firebase.google.com/) (Authentication, Firestore, Functions)
- **Email**: [EmailJS](https://www.emailjs.com/)
- **AI Integration**: [Google AI & Genkit](https://firebase.google.com/docs/genkit)
- **Forms**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)
- **Styling**: [Lucide React](https://lucide.dev/) for icons

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

- Node.js (v18 or later)
- npm or yarn
- An active [EmailJS](https://www.emailjs.com/) account.

### Installation

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/your-username/leoportal.git
    cd leoportal
    ```

2.  **Install NPM packages:**
    ```sh
    npm install
    ```

3.  **Set up Environment Variables:**
    - Create a file named `.env.local` in the root of your project.
    - Add your EmailJS credentials to this file as shown in the **Email Setup** section below.

4.  **Set up Firebase Security Rules:**
    - Go to your Firebase project console.
    - Navigate to **Firestore Database** -> **Rules**.
    - Copy the contents of `firestore.rules` from this repository and paste them into the editor.
    - Click **Publish**.

5.  **Deploy Firebase Functions (Required for Notifications):**
    - Follow the instructions in `TESTING.md` to set up and deploy the backend functions necessary for sending notifications.

6.  **Run the development server:**
    ```sh
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 📧 Email Setup (Using EmailJS)

This application uses EmailJS to send emails from the "Communication" page.

### Step 1: Get Your EmailJS Credentials

1.  Log in to your [EmailJS Dashboard](https://dashboard.emailjs.com/).
2.  **Add an Email Service**: Go to the "Email Services" tab and add a new service (e.g., Gmail). Follow the instructions to connect your email account. Note your **Service ID**.
3.  **Find Your Public Key**: Go to the "Account" tab. Your **Public Key** (previously called User ID) is displayed here.
4.  **Create an Email Template**:
    *   Go to the "Email Templates" tab and click "Create New Template".
    *   Note the **Template ID** from the settings.
    *   On the "Content" tab, design your email. You **must** use the following dynamic variables (double curly braces):
        *   `{{to_name}}`: The recipient's name.
        *   `{{to_email}}`: The recipient's email address.
        *   `{{subject}}`: The subject line you type on the Communication page.
        *   `{{body_content}}`: The email body you write on the Communication page.
        *   `{{current_year}}`: The current year for the footer.
    *   You can use the provided HTML file `src/lib/email-templates/default-notification.html` as a starting point. Copy its content into the EmailJS template editor.
    *   Save your template.

### Step 2: Configure Environment Variables

Create a file named `.env.local` in the root of your project and add your credentials like this:

```
# .env.local

# For the Admin "Communication" page (Client-Side)
NEXT_PUBLIC_EMAILJS_SERVICE_ID=YOUR_SERVICE_ID
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=YOUR_TEMPLATE_ID
NEXT_PUBLIC_EMAILJS_USER_ID=YOUR_PUBLIC_KEY
```

Replace `YOUR_SERVICE_ID`, `YOUR_TEMPLATE_ID`, and `YOUR_PUBLIC_KEY` with the actual values from your EmailJS account.

---

## 📄 License

Distributed under the MIT License.
