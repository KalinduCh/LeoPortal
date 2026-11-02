
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

const KNOWLEDGE_COLLECTION = 'leo_ai_knowledge';
const CONVERSATIONS_COLLECTION = 'leo_ai_conversations';

/**
 * --- Knowledge Management (Super Admin) ---
 */

export async function createKnowledge(data: Omit<AiKnowledge, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, KNOWLEDGE_COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateKnowledge(id: string, data: Partial<AiKnowledge>): Promise<void> {
  const docRef = doc(db, KNOWLEDGE_COLLECTION, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteKnowledge(id: string): Promise<void> {
  await deleteDoc(doc(db, KNOWLEDGE_COLLECTION, id));
}

export async function getAllKnowledge(): Promise<AiKnowledge[]> {
  const q = query(collection(db, KNOWLEDGE_COLLECTION), orderBy('updatedAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ 
    id: d.id, 
    ...d.data(),
    createdAt: d.data().createdAt?.toDate()?.toISOString(),
    updatedAt: d.data().updatedAt?.toDate()?.toISOString(),
  } as AiKnowledge));
}

/**
 * --- LEO AI Chat Logic ---
 */

/**
 * Retrieves relevant context based on user visibility permissions
 */
async function getRelevantContext(queryText: string, visibilityLimit: AiKnowledgeVisibility[]): Promise<AiKnowledge[]> {
  // Simple "Free" implementation: Fetch active knowledge for allowed visibility
  // In a production environment, we would use vector embeddings here.
  // For now, we'll fetch the most recent entries within the visibility scope.
  const q = query(
    collection(db, KNOWLEDGE_COLLECTION),
    where('isActive', '==', true),
    where('visibility', 'in', visibilityLimit),
    limit(10) // Limit context to stay within Gemini free tier token constraints
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AiKnowledge));
}

export async function askLeoAi(
  userQuery: string, 
  userRole: 'public' | 'member' | 'admin',
  history: AiMessage[] = []
): Promise<{ answer: string; sources: { title: string; id: string }[] }> {
  
  // Define visibility scope
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
  3. Never reveal "Admin Only" info to "Public" users (the system handles this, but be mindful).
  4. Keep responses concise and well-formatted.
  5. If you don't know, suggest contacting the club secretary.
  
  User Role: ${userRole}`;

  try {
    const aiResponse = await callGeminiWithRetry(userQuery, systemPrompt);
    
    // Simple source detection based on the answer content
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
