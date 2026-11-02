
import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import type { AiKnowledge, AiKnowledgeCategory, AiKnowledgeVisibility, AiMessage } from '@/types/leo-ai';
import { callGeminiWithRetry } from '@/ai/model-selector';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

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
      createdAt: d.data().createdAt?.toDate()?.toISOString(),
      updatedAt: d.data().updatedAt?.toDate()?.toISOString(),
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
 * --- LEO AI Chat Logic ---
 */

async function getRelevantContext(queryText: string, visibilityLimit: AiKnowledgeVisibility[]): Promise<AiKnowledge[]> {
  const q = query(
    collection(db, KNOWLEDGE_COLLECTION),
    where('isActive', '==', true),
    where('visibility', 'in', visibilityLimit),
    limit(10)
  );
  
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AiKnowledge));
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

export async function askLeoAi(
  userQuery: string, 
  userRole: 'public' | 'member' | 'admin',
  history: AiMessage[] = []
): Promise<{ answer: string; sources: { title: string; id: string }[] }> {
  
  const visibilityScope: AiKnowledgeVisibility[] = ['public'];
  if (userRole === 'member' || userRole === 'admin') visibilityScope.push('members');
  if (userRole === 'admin') visibilityScope.push('admin_only');

  const context = await getRelevantContext(userQuery, visibilityScope);
  const contextString = context.map(c => `[SOURCE: ${c.title}]\n${c.content}`).join('\n\n');
  
  const systemPrompt = `You are LEO AI, the intelligent assistant for the Leo Club of Athugalpura.
  Your tone is professional, helpful, and premium.
  You represent a youth community service organization.
  
  USE THE FOLLOWING KNOWLEDGE CONTEXT TO ANSWER THE USER:
  ${contextString}
  
  GUIDELINES:
  1. If the answer is in the context, use it.
  2. If the context doesn't have the answer, use your general knowledge about Leoism/Lions but clearly state if it's general info.
  3. Never reveal "Admin Only" info to "Public" users.
  4. Keep responses concise and well-formatted.
  5. If you don't know, suggest contacting the club secretary.
  
  User Role: ${userRole}`;

  try {
    const aiResponse = await callGeminiWithRetry(userQuery, systemPrompt);
    const usedSources = context
        .filter(c => aiResponse.toLowerCase().includes(c.title.toLowerCase()))
        .map(c => ({ title: c.title, id: c.id }));

    return {
      answer: aiResponse,
      sources: usedSources
    };
  } catch (error: any) {
    console.error("LEO_AI_CHAT_ERROR:", error);
    throw new Error(error.message || "I'm having trouble thinking right now. Please try again.");
  }
}
