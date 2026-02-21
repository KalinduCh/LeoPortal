
# LeoPortal - Leo Club Management System

![LeoPortal Logo](https://i.imgur.com/aRktweQ.png)

LeoPortal is a comprehensive, modern web application designed to streamline the management and engagement of Leo Club members. Built with a powerful stack including Next.js, Firebase, and Genkit for AI.

## ✨ Key Features

### PWA & Push Notifications
LeoPortal is a fully functional Progressive Web App.
- **Service Worker**: Robust background messaging for reliable push notifications.
- **Task Alerts**: Members receive instant notifications when assigned to a task.
- **Event Alerts**: Reminders before and on the day of events.
- **Account Status**: Alerts when your registration is approved.

### Member & Club Management
- **Role-Based Access Control**: Dashboards for Admins and Members.
- **Granular Permissions**: Assign module-specific access to other admins.

### Event & Attendance
- **Event Management**: Admins can create, update, and delete club events.
- **Interactive Calendar**: Color-coded year plan visualization.
- **Smart Attendance Tracking**: Geolocation-restricted attendance for ongoing events.
- **Post-Event Summaries**: View detailed post-event summaries with participant lists.

### Communication & Project Management
- **AI-Powered Communication**: Generate professional emails with attachments.
- **AI-Powered Project Proposals**: Transform member ideas into structured proposals using AI.
- **Task Management**: Kanban board for organizing club activities with automated alerts.

## 🛠️ Tech Stack
- **Framework**: Next.js 15 (Node 18 compatible)
- **Backend**: Firebase (Auth, Firestore, Functions)
- **AI**: Google Gemini 1.5 Flash (via Genkit 1.x)
- **UI**: Shadcn/UI, Tailwind CSS, Lucide icons

## 🚀 Getting Started

### 1. Install Dependencies
```sh
npm install
```

### 2. Environment Setup
Create a `.env` file and add your credentials. Key variables include:
- `GOOGLE_GENAI_API_KEY`: Your Generative Language API Key.
- `GMAIL_EMAIL`: System email for notifications.
- `GMAIL_APP_PASSWORD`: App password for Gmail SMTP.
- `GOOGLE_SHEET_ID`: ID of the sheet for member sync.

### 3. Run Development
```sh
npm run dev
```

---
© 2026 Leo Club of Athugalpura.
