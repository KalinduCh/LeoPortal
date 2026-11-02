import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import type { AiKnowledge, AiMessage } from '@/types/leo-ai';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { askLeoAiAction } from '@/app/actions/leo-ai';

const KNOWLEDGE_COLLECTION = 'leo_ai_knowledge';

/**
 * --- Knowledge Management (Super Admin) ---
 */

export async function createKnowledge(data: Omit<AiKnowledge, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const payload: any = {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    const docRef = await addDoc(collection(db, KNOWLEDGE_COLLECTION), payload);
    return docRef.id;
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: KNOWLEDGE_COLLECTION,
        operation: 'create',
        requestResourceData: payload,
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    }
    throw error;
  }
}

export async function updateKnowledge(id: string, data: Partial<AiKnowledge>): Promise<void> {
  const docRef = doc(db, KNOWLEDGE_COLLECTION, id);
  const payload = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  try {
    await updateDoc(docRef, payload);
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: payload,
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    }
    throw error;
  }
}

export async function deleteKnowledge(id: string): Promise<void> {
  const docRef = doc(db, KNOWLEDGE_COLLECTION, id);
  try {
    await deleteDoc(docRef);
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete',
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    }
    throw error;
  }
}

export async function getAllKnowledge(): Promise<AiKnowledge[]> {
  const q = query(collection(db, KNOWLEDGE_COLLECTION), orderBy('updatedAt', 'desc'));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ 
      id: d.id, 
      ...d.data(),
      createdAt: (d.data().createdAt as any)?.toDate?.()?.toISOString(),
      updatedAt: (d.data().updatedAt as any)?.toDate?.()?.toISOString(),
    } as AiKnowledge));
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: KNOWLEDGE_COLLECTION,
        operation: 'list',
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    }
    throw error;
  }
}

/**
 * --- LEO AI Chat Bridge ---
 * Now calls the secure Server Action instead of running on the client.
 */

export async function askLeoAi(
  userQuery: string, 
  userRole: 'public' | 'member' | 'admin',
  history: AiMessage[] = []
): Promise<{ answer: string; sources: { title: string; id: string }[] }> {
  // Delegate to the secure server action to protect the Gemini API Key
  return askLeoAiAction(userQuery, userRole, history);
}
