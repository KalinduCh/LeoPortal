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
- **AI Integration**: [Google AI & Genkit](https://firebase.google.com/docs/genkit)
- **Forms**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)
- **Styling**: [Lucide React](https://lucide.dev/) for icons

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

- Node.js (v18 or later)
- npm or yarn

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

3.  **Configure Push Notifications (Required):**
    - Go to your **Firebase Project Settings** -> **Cloud Messaging** tab.
    - Under the **Web configuration** section, find **Web Push certificates**.
    - If no key pair exists, click **Generate key pair**.
    - Copy the long string from the **Key pair** field.
    - Open the file `src/hooks/use-fcm.ts`.
    - Paste your key to replace the placeholder, like this:
      ```typescript
      // src/hooks/use-fcm.ts
      const VAPID_KEY = "YOUR_KEY_PAIR_STRING_GOES_HERE";
      ```

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

## 📄 License

Distributed under the MIT License.
