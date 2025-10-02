
// src/services/monthlyPointsService.ts
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import type { MonthlyPoints } from '@/types';

const monthlyPointsCollection = collection(db, 'monthlyPoints');

// Helper to convert Firestore doc to MonthlyPoints type
const docToMonthlyPoints = (docSnap: any): MonthlyPoints => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    userId: data.userId,
    userName: data.userName,
    photoUrl: data.photoUrl,
    month: data.month,
    year: data.year,
    chairSecTrePoints: data.chairSecTrePoints || 0,
    ocPoints: data.ocPoints || 0,
    meetingPoints: data.meetingPoints || 0,
    clubProjectPoints: data.clubProjectPoints || 0,
    districtProjectPoints: data.districtProjectPoints || 0,
    multipleProjectPoints: data.multipleProjectPoints || 0,
    totalPoints: data.totalPoints || 0,
    updatedAt: (data.updatedAt as Timestamp).toDate().toISOString(),
  };
};

/**
 * Fetches the monthly points for all users for a specific month and year.
 * @param month - The month (0-11).
 * @param year - The year.
 * @returns A promise that resolves to an array of MonthlyPoints.
 */
export async function getMonthlyPointsForPeriod(month: number, year: number): Promise<MonthlyPoints[]> {
  const q = query(
    monthlyPointsCollection,
    where('month', '==', month),
    where('year', '==', year)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToMonthlyPoints);
}

/**
 * Saves a batch of monthly points data. It creates or overwrites the points for each user for a specific month.
 * @param pointsData - An array of MonthlyPoints objects to save.
 */
export async function saveMonthlyPointsBatch(pointsData: MonthlyPoints[]): Promise<void> {
  if (pointsData.length === 0) {
    return;
  }
  
  const batch = writeBatch(db);
  const now = Timestamp.now();

  pointsData.forEach(data => {
    // Create a predictable ID based on year, month, and user ID
    const docId = `${data.year}-${data.month}-${data.userId}`;
    const docRef = doc(db, 'monthlyPoints', docId);
    
    const dataToSave: any = {
        ...data,
        updatedAt: now,
    };
    // Remove fields that should not be in the document directly if they are part of the object
    delete dataToSave.id;

    batch.set(docRef, dataToSave, { merge: true }); // Use set with merge to create or update
  });

  await batch.commit();
}
