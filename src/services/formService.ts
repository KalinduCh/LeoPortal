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
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import type { FormRecord } from '@/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const FORMS_COLLECTION = 'forms';

const docToForm = (docSnap: any): FormRecord => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  } as FormRecord;
};

export async function createForm(data: Omit<FormRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const formData = {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    const docRef = await addDoc(collection(db, FORMS_COLLECTION), formData);
    return docRef.id;
  } catch (err: any) {
    const permissionError = new FirestorePermissionError({
      path: FORMS_COLLECTION,
      operation: 'create',
      requestResourceData: formData,
    });
    errorEmitter.emit('permission-error', permissionError);
    throw err;
  }
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
  const updateData = { ...data, updatedAt: serverTimestamp() };
  delete (updateData as any).id;
  
  try {
    await updateDoc(docRef, updateData);
  } catch (err: any) {
    const permissionError = new FirestorePermissionError({
      path: docRef.path,
      operation: 'update',
      requestResourceData: updateData,
    });
    errorEmitter.emit('permission-error', permissionError);
    throw err;
  }
}

export async function deleteForm(id: string): Promise<void> {
  const docRef = doc(db, FORMS_COLLECTION, id);
  try {
    await deleteDoc(docRef);
  } catch (err: any) {
    const permissionError = new FirestorePermissionError({
      path: docRef.path,
      operation: 'delete',
    });
    errorEmitter.emit('permission-error', permissionError);
    throw err;
  }
}

/**
 * Fetches responses from an external Google Apps Script API endpoint.
 */
export async function getFormResponses(apiUrl: string): Promise<any[]> {
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error('Failed to fetch responses from external API');
    return await response.json();
  } catch (error) {
    console.error('Error fetching external responses:', error);
    return [];
  }
}