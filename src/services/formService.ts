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
  where,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import type { FormRecord } from '@/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const FORMS_COLLECTION = 'forms';

/**
 * Recursively removes undefined values from an object before sending to Firestore.
 */
function sanitizeData(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(sanitizeData);
    } else if (obj !== null && typeof obj === 'object' && !(obj instanceof Date) && !(obj instanceof Timestamp)) {
        return Object.fromEntries(
            Object.entries(obj)
                .filter(([_, v]) => v !== undefined)
                .map(([k, v]) => [k, sanitizeData(v)])
        );
    }
    return obj;
}

const docToForm = (docSnap: any): FormRecord => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    type: data.type || 'google_form', // Fallback for legacy records
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  } as FormRecord;
};

/**
 * Creates a new form module using a non-blocking mutation pattern.
 */
export async function createForm(data: Omit<FormRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const formRef = doc(collection(db, FORMS_COLLECTION));
  const formData = sanitizeData({
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Initiate non-blocking write
  setDoc(formRef, formData)
    .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: formRef.path,
            operation: 'create',
            requestResourceData: formData,
        });
        errorEmitter.emit('permission-error', permissionError);
    });

  return formRef.id;
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

/**
 * Updates an existing form using a non-blocking mutation pattern.
 */
export async function updateForm(id: string, data: Partial<FormRecord>): Promise<void> {
  const docRef = doc(db, FORMS_COLLECTION, id);
  const updateData = sanitizeData({ ...data, updatedAt: serverTimestamp() });
  delete (updateData as any).id;
  
  updateDoc(docRef, updateData)
    .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: updateData,
        });
        errorEmitter.emit('permission-error', permissionError);
    });
}

export async function deleteForm(id: string): Promise<void> {
  const docRef = doc(db, FORMS_COLLECTION, id);
  deleteDoc(docRef)
    .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
    });
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
