
# LeoPortal - Leo Club Management System

![LeoPortal Logo](https://i.imgur.com/aRktweQ.png)

## 🏆 Award-Winning Platform
LeoPortal is the proud recipient of multiple honors for the Leostic Year 2025/26:
- 🎖️ **Best Innovative Project**
- 🎖️ **Best IT Enabled Club**

LeoPortal is a comprehensive, modern web application designed to streamline the management and engagement of Leo Club members. Built with a powerful stack including Next.js, Firebase, and Genkit for AI.

## ✨ Key Features

### 🎟️ LeoEntrivo - District Access Platform
A professional-grade event ticketing and entrance management system tailored for District 306 D9 events.
- **Dual Registration Engine**: Supports seamless single-entry registrations and high-volume Club Bulk Uploads via CSV.
- **Officer Security Layer**: Mandatory identification for bulk submittals (President/Secretary details) to ensure a secure audit trail.
- **Participation Analytics**: Real-time dashboard with arrival velocity charts, registration source tracking, and demographic breakdowns.
- **Digital QR Passes**: Automated generation and email delivery of unique entry tickets with anti-spam verification.
- **Ground Command Center**: Real-time arrival feed and attendee registry management for organizers.
- **Pro Entrance Scanner**: Mobile-optimized QR scanner featuring haptic feedback and explicit verification states.

### 🏆 Gamification & Engagement
- **Impact Leaderboard**: Monthly rankings based on member participation and leadership roles.
- **Automated Badges**: Members earn achievements like "Top Volunteer," "Active Leo," and "Club Leader" based on their activity.
- **Points System**: Integrated points allocation for meeting attendance, project participation, and executive roles.

### 💡 AI Project Proposal Hub
- **Proposal Architect**: Transform raw project ideas into structured, professional proposals using Gemini 1.5 Flash.
- **Full Action Plans**: AI generates objectives, execution schedules, PR plans, and estimated budgets in LKR.
- **Review Workflow**: Members submit proposals for Admin review, with feedback loops for revisions.

### 📋 Task & Project Management
- **Kanban Board**: Drag-and-drop task management for club projects.
- **Sub-tasks & Checklists**: Track granular progress within larger project goals.
- **Collaborative Comments**: Real-time communication on tasks with automatic push notifications.

### 📱 PWA & Push Notifications
- **Service Worker**: Robust background messaging for reliable push notifications on Android and iOS (16.4+).
- **Automated Alerts**: Instant notifications for task assignments, event publications, and account approvals.

### 📅 Club Operations
- **Interactive Year Plan**: Color-coded calendar for club, district, and multiple projects.
- **Finance Ledger**: Comprehensive income and expense tracking with PDF/CSV reporting.
- **Smart Attendance**: Geolocation-restricted attendance marking to ensure member presence.

## 🛠️ Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Backend**: Firebase (Auth, Firestore, Functions, Cloud Messaging)
- **AI**: Google Genkit with Gemini 1.5 Flash
- **UI**: Shadcn/UI, Tailwind CSS, Lucide Icons, Recharts

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

---
© 2026 Leo District 306 D9 Event Management Platform.
Designed & Powered by Leo Club of Athugalpura.
