# LeoPortal - Leo Club Management System

![LeoPortal Logo](https://i.imgur.com/aRktweQ.png)

LeoPortal is a comprehensive, modern web application designed to streamline the management and engagement of Leo Club members. Built with a powerful stack including Next.js, Firebase, and Genkit for AI.

## ✨ Key Features

### PWA & Push Notifications
LeoPortal is a fully functional Progressive Web App. You can install it on your home screen (iOS & Android) for a native app-like experience. Members receive instant push notifications for:
- **Event Alerts**: Reminders 2 days before and on the day of events.
- **Account Status**: Alerts when your registration is approved.
- **Membership Fees**: Friendly reminders for pending annual dues.
- **New Projects**: Notification when a new club project is published.

### Member & Club Management
- **Role-Based Access Control**: Dashboards for Admins and Members.
- **Authentication**: Secure registration flow with admin approval.
- **Granular Permissions**: Super Admins can assign module-specific access to other admins.

### Event & Tasks
- **Smart Attendance**: Geolocation-restricted attendance tracking.
- **Interactive Calendar**: Color-coded year plan visualization.
- **Task Management**: Kanban board for organizing club activities.

### Financial & Project Hub
- **Finance Dashboard**: Income/Expense tracking with yearly and monthly filters.
- **AI Project Proposals**: AI transforms simple ideas into structured proposals.

## 🛠️ Tech Stack
- **Framework**: Next.js (Node 18 compatible)
- **Backend**: Firebase (Auth, Firestore, Functions)
- **AI**: Google Gemini & Genkit
- **UI**: Shadcn/UI, Tailwind CSS, Lucide icons

## 🚀 Getting Started

### 1. Clone & Install
```sh
npm install
```

### 2. Environment Setup
Create a `.env` file and add:
- `GMAIL_EMAIL` & `GMAIL_APP_PASSWORD`: For system notifications.
- `GEMINI_API_KEY`: From Google AI Studio.
- `GOOGLE_SHEET_*`: For member data synchronization.

### 3. Run Development
```sh
npm run dev
```

---
© 2026 Leo Club of Athugalpura.