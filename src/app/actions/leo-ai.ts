
'use server';

/**
 * @fileOverview Secure Server Actions for LEO AI.
 * Handles role-based knowledge filtering and secure Gemini 3.8 Flash generation.
 */

import { adminDb } from '@/lib/firebase/admin/config';
import { callGeminiSimple } from '@/ai/model-selector';
import type { AiKnowledge, AiKnowledgeVisibility, AiMessage } from '@/types/leo-ai';

/**
 * Fetches relevant context using Admin SDK.
 * Simplified retrieval to minimize overhead and bypass index requirements.
 */
async function getFilteredContext(userRole: 'public' | 'member' | 'admin'): Promise<AiKnowledge[]> {
  try {
    const allowedVisibilities: AiKnowledgeVisibility[] = ['public'];
    if (userRole === 'member' || userRole === 'admin') allowedVisibilities.push('members');
    if (userRole === 'admin') allowedVisibilities.push('admin_only');

    // Fetch the most recent active entries (capped for context window size)
    const snapshot = await adminDb().collection('leo_ai_knowledge')
      .where('isActive', '==', true)
      .limit(25)
      .get();
    
    const allKnowledge = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AiKnowledge));

    return allKnowledge.filter(k => allowedVisibilities.includes(k.visibility));
  } catch (error) {
    console.error("LEO_AI_CONTEXT_FETCH_FAILURE:", error);
    return [];
  }
}

/**
 * The primary secure bridge for LEO AI chat.
 */
export async function askLeoAiAction(
  userQuery: string, 
  userRole: 'public' | 'member' | 'admin',
  history: AiMessage[] = []
): Promise<{ answer: string; sources: { title: string; id: string }[] }> {
  
  // 1. Retrieve context based on role
  const context = await getFilteredContext(userRole);
  const contextString = context.map(c => `[SOURCE: ${c.title}]\n${c.content}`).join('\n\n');
  
  // 2. Prepare History
  const historyString = history
    .slice(-5)
    .map(m => `${m.role === 'user' ? 'User' : 'LEO AI'}: ${m.content}`)
    .join('\n');

  // 3. System Prompt
  const systemPrompt = `You are LEO AI, the premium intelligent assistant for the Leo Club of Athugalpura.
  Your tone is professional, friendly, and helpful.
  
  KNOWLEDGE BASE:
  ${contextString || 'No specific club documents are available for this query.'}
  
  CONVERSATION HISTORY:
  ${historyString || 'New conversation started.'}
  
  INSTRUCTIONS:
  1. Use the KNOWLEDGE BASE to provide accurate answers about the club.
  2. If the answer is not in the knowledge base, use your general intelligence but note it is general info.
  3. User role is: ${userRole.toUpperCase()}. Never disclose "Admin Only" info to others.
  4. Be concise and helpful.`;

  try {
    // 4. API Call
    const aiResponse = await callGeminiSimple(userQuery, systemPrompt);
    
    if (!aiResponse) throw new Error("LEO AI is thinking, but the answer was empty.");

    // 5. Track used sources (simple name matching)
    const usedSources = context
        .filter(c => aiResponse.toLowerCase().includes(c.title.toLowerCase().substring(0, 10)))
        .map(c => ({ title: c.title, id: c.id }));

    return {
      answer: aiResponse,
      sources: usedSources
    };
  } catch (error: any) {
    console.error("LEO_AI_SERVER_ERROR:", error);
    throw new Error(error.message || "LEO AI is temporarily offline.");
  }
}
