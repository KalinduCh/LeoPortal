import * as admin from 'firebase-admin';

const firebaseAdminConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'leoathugal',
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

export function getAdminApp() {
  if (!admin.apps.length) {
    if (firebaseAdminConfig.clientEmail && firebaseAdminConfig.privateKey) {
      return admin.initializeApp({
        credential: admin.credential.cert({
          projectId: firebaseAdminConfig.projectId,
          clientEmail: firebaseAdminConfig.clientEmail,
          privateKey: firebaseAdminConfig.privateKey,
        }),
        projectId: firebaseAdminConfig.projectId,
      });
    } else {
      // If we're on a platform with application default credentials, this might work
      // Otherwise, we might get an error when trying to use it.
      return admin.initializeApp({
        projectId: firebaseAdminConfig.projectId,
      });
    }
  }
  return admin.app();
}

export const adminDb = () => getAdminApp().firestore();
export const adminMessaging = () => getAdminApp().messaging();
export const adminAuth = () => getAdminApp().auth();
