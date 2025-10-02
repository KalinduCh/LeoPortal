
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
    addedBy: data.addedBy,
    createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
  };
};

export async function addPointsEntry(data: Omit<PointsEntry, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(pointsCollectionRef, {
    ...data,
    date: Timestamp.fromDate(new Date(data.date)),
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getPointsEntries(): Promise<PointsEntry[]> {
  const q = query(pointsCollectionRef, orderBy('date', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToPointsEntry);
}

export async function deletePointsEntry(id: string): Promise<void> {
  const docRef = doc(db, 'pointsEntries', id);
  await deleteDoc(docRef);
}
