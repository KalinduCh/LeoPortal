'use server';

/**
 * @fileOverview Server Actions for LEO AI.
 * Handles secure AI generation and privileged knowledge retrieval.
 */

import { adminDb } from '@/lib/firebase/admin/config';
import { callGeminiWithRetry } from '@/ai/model-selector';
import type { AiKnowledge, AiKnowledgeVisibility, AiMessage } from '@/types/leo-ai';

/**
 * Fetches relevant context from Firestore using the Admin SDK.
 * This runs on the server, keeping the RAG process secure.
 */
async function getRelevantContext(queryText: string, visibilityLimit: AiKnowledgeVisibility[]): Promise<AiKnowledge[]> {
  try {
    const knowledgeRef = adminDb().collection('leo_ai_knowledge');
    const snapshot = await knowledgeRef
      .where('isActive', '==', true)
      .where('visibility', 'in', visibilityLimit)
      .limit(10)
      .get();
    
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AiKnowledge));
  } catch (error) {
    console.error("ADMIN_CONTEXT_FETCH_FAILURE:", error);
    return [];
  }
}

/**
 * The primary server-side function for LEO AI chat.
 * Securely uses the GOOGLE_GENAI_API_KEY on the backend.
 */
export async function askLeoAiAction(
  userQuery: string, 
  userRole: 'public' | 'member' | 'admin',
  history: AiMessage[] = []
): Promise<{ answer: string; sources: { title: string; id: string }[] }> {
  
  const visibilityScope: AiKnowledgeVisibility[] = ['public'];
  if (userRole === 'member' || userRole === 'admin') visibilityScope.push('members');
  if (userRole === 'admin') visibilityScope.push('admin_only');

  // 1. Retrieve RAG Context
  const context = await getRelevantContext(userQuery, visibilityScope);
  const contextString = context.map(c => `[SOURCE: ${c.title}]\n${c.content}`).join('\n\n');
  
  // 2. Construct System Prompt
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
    // 3. Call AI via Interactions API (Server-Side)
    const aiResponse = await callGeminiWithRetry(userQuery, systemPrompt);
    
    // 4. Extract which sources were actually referenced in the response
    const usedSources = context
        .filter(c => aiResponse.toLowerCase().includes(c.title.toLowerCase()))
        .map(c => ({ title: c.title, id: c.id }));

    return {
      answer: aiResponse,
      sources: usedSources
    };
  } catch (error: any) {
    console.error("LEO_AI_SERVER_ERROR:", error);
    throw new Error(error.message || "LEO AI encountered a temporary issue. Please try again.");
  }
}
