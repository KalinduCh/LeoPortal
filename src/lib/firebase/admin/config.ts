import * as admin from 'firebase-admin';

/**
 * Robust Admin App Initialization
 * Ensures Firebase Admin is only initialized once and prevents gRPC 500 errors
 * caused by auto-discovery loops in non-GCP environments (Netlify/Local).
 */
export function getAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'leoathugal';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Handle Netlify's double-escaping of newlines in private keys
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    const errorMsg = "FIREBASE_ADMIN_ERROR: Missing server-side credentials (FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY). " +
                     "Please configure these in your Netlify Environment Variables.";
    
    // We log a warning but don't crash the whole build process. 
    // Individual server actions will throw when they attempt to use these getters.
    console.warn(errorMsg);
    throw new Error(errorMsg);
  }

  try {
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    });
  } catch (error) {
    console.error("ADMIN_INIT_FATAL_ERROR:", error);
    throw error;
  }
}

export const adminDb = () => getAdminApp().firestore();
export const adminMessaging = () => getAdminApp().messaging();
export const adminAuth = () => getAdminApp().auth();
