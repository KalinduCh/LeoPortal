# LEO Portal - Release Notes: Photo Hub & Analytics Update

This update introduces major structural improvements to how we manage project memories and reporting, while resolving critical system conflicts to ensure maximum stability.

---

## ✨ New Features

### 📸 1. Project Gallery (Photo Hub)
We have introduced a project-centric way to preserve club memories without needing expensive cloud storage.
-   **Integrated Google Drive**: Each event can now be linked to a specific Drive folder for viewing and a contribution link for uploading.
-   **Master Shared Hub**: Quick access to the root Drive folder directly from the hub.
-   **Contributor UX**: Members can easily find a project and contribute their photos to help preserve the club's impact history.
-   **Setup Guide for Admins**: Built-in instructions in the Event Form to ensure folders are shared and linked correctly.

### 📊 2. Monthly Executive Summary (PDF)
Admins can now generate professional, high-level reports for any month.
-   **Financial Snapshot**: Total Income vs. Total Expenses with net balance.
-   **Membership Growth**: Automatic listing of new members onboarded during the period.
-   **Project Performance**: Ledger of all held events and their total attendance counts.
-   **Engagement Leaderboard**: Top 5 most active members for the specific month.

### 🗓️ 3. Leostic Year Fee Management
Refined logic for the club's fiscal cycle (June 1st - June 1st).
-   **Annual Reset**: Statuses automatically reset on June 1st.
-   **Manual Trigger**: Super Admins can manually trigger the reset for the current year to clear the board.
-   **Financial Integrity**: Fee status resets do not affect historical transaction records.

### 🔔 4. Push Notification Integration
Full integration of Firebase Cloud Messaging (FCM).
-   **Web Push Support**: Reliable notifications for task assignments and event alerts.
-   **PWA Optimized**: Works seamlessly when installed as a standalone app on Android and iOS.

---

## 🛠️ System Improvements & Fixes

### 🛡️ Conflict Resolution
-   **Resolved Critical Syntax Errors**: Fixed merge conflict markers (`<<<<<<<`, `=======`) that were preventing the server from starting.
-   **Consolidated Logic**: Merged disparate versions of User and Event services into a unified, stable core.

### 🐛 Bug Fixes
-   **Hydration Error Fixed**: Resolved a "<ul> inside <p>" console error in the Member Management dialog.
-   **Import Path Correction**: Fixed "Module not found" errors related to the `Tabs` and `DialogDescription` components.
-   **Manual Marking**: Admins can now manually mark attendance for members who missed the QR scan.

### 🧹 Cleaned & Removed
-   **Removed redundant "Push Tester" utility**: Transitioned to integrated system-wide alerts.
-   **Removed legacy "Document Management"**: Transitioned completely to the more efficient Google Drive based Project Gallery system.

---
© 2026 Leo Club of Athugalpura. Designing the future of club management.