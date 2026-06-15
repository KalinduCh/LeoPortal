import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import type { FormRecord } from '@/types';

const FORMS_COLLECTION = 'forms';

const docToForm = (docSnap: any): FormRecord => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  } as FormRecord;
};

export async function createForm(data: Omit<FormRecord, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, FORMS_COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getForms(): Promise<FormRecord[]> {
  const q = query(collection(db, FORMS_COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToForm);
}

export async function getForm(id: string): Promise<FormRecord | null> {
  const docRef = doc(db, FORMS_COLLECTION, id);
  const snap = await getDoc(docRef);
  return snap.exists() ? docToForm(snap) : null;
}

export async function updateForm(id: string, data: Partial<FormRecord>): Promise<void> {
  const docRef = doc(db, FORMS_COLLECTION, id);
  const updateData = { ...data };
  delete (updateData as any).id;
  await updateDoc(docRef, updateData);
}

export async function deleteForm(id: string): Promise<void> {
  const docRef = doc(db, FORMS_COLLECTION, id);
  await deleteDoc(docRef);
}

export async function getFormResponses(apiUrl: string): Promise<any[]> {
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error('Failed to fetch responses from external API');
    return await response.json();
  } catch (error) {
    console.error('Error fetching responses:', error);
    return [];
  }
}
