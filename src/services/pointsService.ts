// src/services/pointsService.ts
import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  Timestamp,
  query,
  orderBy,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import type { PointsEntry } from '@/types';

const pointsCollectionRef = collection(db, 'pointsEntries');

const docToPointsEntry = (docSnap: any): PointsEntry => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    userId: data.userId,
    userName: data.userName,
    date: (data.date as Timestamp).toDate().toISOString(),
    description: data.description,
    points: data.points,
    category: data.category,
    projectName: data.projectName,
    addedBy: data.addedBy,
    createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
    eventId: data.eventId,
  };
};

export async function addPointsEntry(data: Omit<PointsEntry, 'id' | 'createdAt'>): Promise<string> {
  const entryData: any = {
    ...data,
    date: Timestamp.fromDate(new Date(data.date)),
    createdAt: serverTimestamp(),
  };

  // Ensure optional fields are not added if they are undefined
  if (!entryData.projectName) {
    delete entryData.projectName;
  }
  if (!entryData.eventId) {
    delete entryData.eventId;
  }
  
  const docRef = await addDoc(pointsCollectionRef, entryData);
  return docRef.id;
}

export async function getPointsForPeriod(month: number, year: number): Promise<PointsEntry[]> {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59);

    const q = query(
        pointsCollectionRef,
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate)),
        orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToPointsEntry);
}


export async function deletePointsEntry(id: string): Promise<void> {
  const docRef = doc(db, 'pointsEntries', id);
  await deleteDoc(docRef);
}
