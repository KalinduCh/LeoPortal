
# LeoPortal - Leo Club Management System

![LeoPortal Logo](https://i.imgur.com/aRktweQ.png)

LeoPortal is a comprehensive, modern web application designed to streamline the management and engagement of Leo Club members. Built with a powerful stack including Next.js, Firebase, and Genkit for AI.

## ✨ Key Features

### 🎟️ LeoEntrivo - District Access Platform
A professional-grade event ticketing and entrance management system tailored for District 306 D9 events.
- **Dual Registration Engine**: Supports seamless single-entry registrations and high-volume Club Bulk Uploads via CSV.
- **Officer Security Layer**: Mandatory identification for bulk submittals (President/Secretary details) to ensure a secure audit trail.
- **Participation Analytics**: Standardized club selection system (Athugalpura, UOP, Kandy, etc.) to track attendance density and generate club-wise reports.
- **Digital QR Passes**: Automated generation and email delivery of unique entry tickets with built-in delivery status tracking (Delivered/Failed).
- **Ground Command Center**: Real-time dashboard for organizers with a live arrival feed and attendee registry management.
- **Pro Entrance Scanner**: Mobile-optimized, transactional QR scanner featuring haptic feedback and explicit verification states (Access Granted, Already Entered, Invalid).

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

## 🛠️ Tech Stack
- **Framework**: Next.js 15 (Node 18 compatible)
- **Backend**: Firebase (Auth, Firestore, Functions)
- **AI**: Google Gemini 1.5 Flash (Efficient & Compatible)
- **UI**: Shadcn/UI, Tailwind CSS, Lucide icons

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Create a `.env` file in the root and `functions/` directory.
- `GOOGLE_GENAI_API_KEY`: Your Gemini API Key.
- `GMAIL_EMAIL`: System email for notifications.
- `GMAIL_APP_PASSWORD`: App password for Gmail SMTP.

### 3. Deploy Backend
To activate push notifications and automated emails:
```bash
firebase deploy --only functions
```
See [DEPLOY.md](./DEPLOY.md) for detailed instructions.

### 4. Run Development
```bash
npm run dev
```

---
© 2026 Leo District 306 D9 Event Management Platform.
Designed & Powered by Leo Club of Athugalpura.
