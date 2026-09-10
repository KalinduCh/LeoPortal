
# 🚀 Deployment Guide: Firebase Functions & Email Configuration

To activate task assignments, event triggers, and automated ticketing, you must configure your secrets and deploy the backend.

## 1. Configure Email Credentials (Gmail)
The platform uses two separate Gmail accounts for routing. Generate an **App Password** for each (Account > Security > 2-Step Verification > App Passwords).

Run these commands to set the secrets:

### Club Portal & Internal Alerts
```bash
firebase functions:secrets:set CLUB_GMAIL_EMAIL
firebase functions:secrets:set CLUB_GMAIL_APP_PASSWORD
```

### LeoEntrivo District Ticketing
```bash
firebase functions:secrets:set DISTRICT_GMAIL_EMAIL
firebase functions:secrets:set DISTRICT_GMAIL_APP_PASSWORD
```

## 2. Deploy Functions
Run the following command from the project root:
```bash
firebase deploy --only functions
```

## 3. Verification
Once deployed, you can verify the status in the [Firebase Console](https://console.firebase.google.com/):
1. Go to **Build > Functions**.
2. You should see `onUserStatusChange`, `onEventCreated`, `onTaskCreated`, and `onTaskUpdated` listed.
3. Check the **Logs** tab if notifications or emails aren't appearing as expected.

---
© 2026 Leo Club of Athugalpura.
