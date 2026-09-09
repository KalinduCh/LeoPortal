import * as admin from 'firebase-admin';

const firebaseAdminConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'leoathugal',
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

/**
 * Robust Admin App Initialization
 * Ensures Firebase Admin is only initialized once and handles missing credentials gracefully.
 */
export function getAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // Check if we have the necessary credentials for manual initialization
  if (firebaseAdminConfig.clientEmail && firebaseAdminConfig.privateKey) {
    try {
      return admin.initializeApp({
        credential: admin.credential.cert({
          projectId: firebaseAdminConfig.projectId,
          clientEmail: firebaseAdminConfig.clientEmail,
          privateKey: firebaseAdminConfig.privateKey,
        }),
        projectId: firebaseAdminConfig.projectId,
      });
    } catch (error) {
      console.error("ADMIN_INIT_ERROR: Failed to initialize with provided credentials.", error);
    }
  }

  // Fallback to default initialization (works in GCP environments or with ADC)
  try {
    return admin.initializeApp({
      projectId: firebaseAdminConfig.projectId,
    });
  } catch (error) {
    console.error("ADMIN_INIT_ERROR: Fallback initialization failed.", error);
    throw new Error("Firebase Admin could not be initialized. Check environment variables.");
  }
}

export const adminDb = () => getAdminApp().firestore();
export const adminMessaging = () => getAdminApp().messaging();
export const adminAuth = () => getAdminApp().auth();
