
# LeoPortal - Leo Club Management System

![LeoPortal Logo](https://i.imgur.com/aRktweQ.png)

## 🏆 Award-Winning Platform
LeoPortal is the proud recipient of multiple honors for the Leostic Year 2025/26:
- 🎖️ **Best Innovative Project**
- 🎖️ **Best IT Enabled Club**

LeoPortal is a comprehensive, modern web application designed to streamline club operations, member engagement, and district-level events. Built with a powerful stack including Next.js 15, Firebase, and Google Genkit for AI.

---

## ✨ Key Features

### 🎟️ LeoEntrivo - District Access Platform
A professional-grade event ticketing and entrance management system tailored for District 306 D9.
- **Dual Registration Engine**: Supports seamless single-entry registrations and high-volume Club Bulk Uploads via CSV.
- **Officer Security Layer**: Mandatory identification for bulk submittals (President/Secretary details) to ensure a secure audit trail.
- **Participation Analytics**: Real-time dashboard with arrival velocity charts, registration source tracking, and demographic breakdowns.
- **Digital QR Passes**: Automated generation and email delivery of unique entry tickets with anti-spam verification.
- **Ground Command Center**: Real-time arrival feed and attendee registry management for organizers.
- **Pro Entrance Scanner**: Mobile-optimized QR scanner featuring haptic feedback and explicit verification states.

### 📸 Project Gallery (Photo Hub)
A project-centric archival system to preserve club memories without expensive cloud storage costs.
- **Google Drive Integration**: Each project is linked to specific Drive sub-folders for viewing and contribution.
- **Master Shared Hub**: Quick access to the root club archive directly from the portal.
- **Contributor UX**: Members can easily find a project and contribute their own photos to help build the club's impact history.

### 💡 AI Project Proposal Hub
- **Proposal Architect**: Transform raw project ideas into structured, professional proposals using Gemini 1.5 Flash.
- **Full Action Plans**: AI generates objectives, execution schedules (Pre/During/Post event), PR plans, and estimated budgets in LKR.
- **PDF Export**: Generate high-quality, formatted PDF proposals for printing or official submission.
- **Review Workflow**: Members submit proposals for Admin review, with feedback loops for revisions.

### 📋 Task & Project Management
- **Kanban Board**: Drag-and-drop task management for club projects.
- **Sub-tasks & Checklists**: Track granular progress within larger project goals.
- **Collaborative Comments**: Real-time communication on tasks with automatic push notifications.

### 🏆 Gamification & Engagement
- **Impact Leaderboard**: Monthly rankings based on member participation and leadership roles.
- **Automated Badges**: Members earn achievements like "Top Volunteer," "Active Leo," and "Club Leader" based on Firestore activity triggers.
- **Points System**: Integrated points allocation for meeting attendance, project participation, and executive roles.

### 📱 PWA & Push Notifications
- **Progressive Web App**: Fully installable on Android and iOS (16.4+) with offline support.
- **Firebase Cloud Messaging (FCM)**: Reliable web push notifications for task assignments, event alerts, and announcements.
- **Offline Sync**: Attendance records are queued locally if connection is lost and synced automatically upon reconnection.

### 📅 Club Operations
- **Interactive Year Plan**: Color-coded calendar for club, district, and multiple projects with "Add to Google Calendar" support.
- **Finance Ledger**: Comprehensive income and expense tracking with PDF/CSV reporting.
- **Smart Attendance**: QR-based marking with Geolocation-restriction (GPS validation) to ensure physical presence.
- **Executive Summaries**: One-click generation of monthly performance reports (PDF).

---

## 🏗️ System Architecture

### Frontend (The UI Layer)
- **Next.js 15 (App Router)**: Utilizing Server Components for performance and Client Components for high interactivity.
- **Shadcn/UI & Tailwind**: A utility-first CSS approach with accessible, professional components.
- **React Hook Form & Zod**: Robust client-side validation for all registration and data entry forms.

### Backend (The Data Layer)
- **Firebase Auth**: Secure authentication with role-based access control (RBAC).
- **Cloud Firestore**: Real-time NoSQL database with granular security rules.
- **Firebase Functions**: Node.js backend triggers for automated emails, birthday wishes, and push notifications.
- **Firebase Cloud Messaging**: Cross-platform messaging service for PWAs.

### Intelligence (The AI Layer)
- **Google Genkit**: A framework for building and deploying production-ready AI features.
- **Gemini 1.5 Flash**: Optimized LLM for high-speed content generation and structured data extraction.

---

## 🛠️ Technology Stack
- **Framework**: Next.js 15
- **Language**: TypeScript
- **Styling**: Tailwind CSS / Shadcn
- **Database**: Firestore
- **AI**: Google Genkit / Gemini
- **Messaging**: FCM (Web Push)
- **Email**: NodeMailer / Gmail SMTP
- **Reporting**: jsPDF / html2canvas / Recharts

---

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
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY`: Public key for Web Push.

### 3. Deploy Backend
To activate push notifications and automated emails:
```bash
firebase deploy --only functions
```

---
© 2026 Leo District 306 D9 Event Management Platform.
Designed & Powered by **Leo Club of Athugalpura**.
