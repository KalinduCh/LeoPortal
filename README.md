
# LeoPortal - Leo Club Management System

![LeoPortal Logo](https://i.imgur.com/aRktweQ.png)

## 🏆 Award-Winning Platform
LeoPortal is the proud recipient of multiple honors for the Leostic Year 2025/26:
- 🎖️ **Best Innovative Project**
- 🎖️ **Best IT Enabled Club**

LeoPortal is a comprehensive, modern web application designed to streamline club operations, member engagement, and district-level events. Built with a powerful stack including Next.js 15, Firebase, and Google Genkit for AI.

---

## 🛠️ Environment Configuration

To run this project locally or in production, create a `.env.local` file in the root directory. Use the following variables:

### 1. Generative AI (Gemini)
- `GOOGLE_GENAI_API_KEY`: Your Google AI Studio API Key (Free tier). Required for proposal generation and communication drafts.

### 2. Push Notifications (FCM)
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY`: Found in Firebase Console > Project Settings > Cloud Messaging > Web Push certificates.
- `FIREBASE_CLIENT_EMAIL`: Service Account Email from Firebase Console > Project Settings > Service Accounts.
- `FIREBASE_PRIVATE_KEY`: Service Account Private Key. (Note: In production/Netlify, ensure newlines are handled: `replace(/\\n/g, '\n')`).

### 3. Email Configuration (Gmail SMTP)
These are used for sending tickets, registration approvals, and member communications.
- **Club Portal Alerts:**
  - `GMAIL_TICKET_CLUB_EMAIL`: The club's official notification email.
  - `GMAIL_TICKET_CLUB_PASSWORD`: Gmail App Password (NOT your regular password).
- **LeoEntrivo (District) Platform:**
  - `GMAIL_TICKET_EMAIL`: The district notification email.
  - `GMAIL_TICKET_APP_PASSWORD`: Gmail App Password for the district account.

---

## ✨ Key Features

### 🎟️ LeoEntrivo - District Access Platform
A professional-grade event ticketing and entrance management system.
- **Dual Registration Engine**: Supports single-entry and Club Bulk Uploads via CSV.
- **Pro Entrance Scanner**: Mobile-optimized QR scanner featuring haptic feedback.
- **Digital QR Passes**: Automated generation and email delivery of unique entry tickets.

### 📸 Project Gallery & Reporting
- **Photo Hub**: Project-centric archival system linked to Google Drive.
- **Monthly Reporting**: Secure repository for periodic club documentation with View/Upload workflows.

### 💡 AI Project Proposal Hub
- **Proposal Architect**: Transform raw project ideas into professional proposals using Gemini 1.5 Flash-8B.
- **PDF Export**: Generate high-quality, formatted PDF proposals for official submission.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Local Development
```bash
npm run dev
```

### 3. Deploy Backend (Functions)
To activate automated emails and scheduled birthday wishes:
```bash
firebase deploy --only functions
```

---
© 2026 Leo District 306 D9 Event Management Platform.
Designed & Powered by **Leo Club of Athugalpura**.
