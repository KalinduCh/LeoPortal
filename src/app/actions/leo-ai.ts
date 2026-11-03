
'use server';

/**
 * @fileOverview Secure Server Actions for LEO AI.
 * Handles role-based knowledge filtering and secure Gemini 3.8 Flash generation.
 */

import { adminDb } from '@/lib/firebase/admin/config';
import { callGeminiWithRetry } from '@/ai/model-selector';
import type { AiKnowledge, AiKnowledgeVisibility, AiMessage } from '@/types/leo-ai';

/**
 * Fetches relevant context using Admin SDK to bypass security rule conflicts.
 * Filtering is performed in code to ensure absolute reliability.
 */
async function getFilteredContext(queryText: string, userRole: 'public' | 'member' | 'admin'): Promise<AiKnowledge[]> {
  try {
    const allowedVisibilities: AiKnowledgeVisibility[] = ['public'];
    if (userRole === 'member' || userRole === 'admin') allowedVisibilities.push('members');
    if (userRole === 'admin') allowedVisibilities.push('admin_only');

    // Fetch all active knowledge (typically small enough for this scale)
    const snapshot = await adminDb().collection('leo_ai_knowledge')
      .where('isActive', '==', true)
      .get();
    
    const allKnowledge = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AiKnowledge));

    // Simple keyword filtering to keep prompt size optimized
    return allKnowledge
      .filter(k => allowedVisibilities.includes(k.visibility))
      .filter(k => {
          const content = (k.title + ' ' + k.content).toLowerCase();
          const query = queryText.toLowerCase();
          // Heuristic: check if any word from query is in content
          return query.split(' ').some(word => word.length > 3 && content.includes(word)) || queryText.length < 5;
      })
      .slice(0, 10); // Limit to top 10 matches
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
  
  // 1. Retrieve & Filter Context securely on server
  const context = await getFilteredContext(userQuery, userRole);
  const contextString = context.map(c => `[SOURCE: ${c.title}]\n${c.content}`).join('\n\n');
  
  // 2. Prepare History for stateless Interactions API
  const historyString = history
    .slice(-5) // Last 5 messages for context
    .map(m => `${m.role === 'user' ? 'User' : 'LEO AI'}: ${m.content}`)
    .join('\n');

  // 3. Construct the Premium System Prompt
  const systemPrompt = `You are LEO AI, the premium intelligent assistant for the Leo Club of Athugalpura.
  Your tone is professional, friendly, and community-oriented.
  
  USE THE FOLLOWING KNOWLEDGE CONTEXT TO ANSWER:
  ${contextString || 'No specific club information found for this query.'}
  
  CONVERSATION HISTORY:
  ${historyString || 'New conversation.'}
  
  GUIDELINES:
  1. If the context contains the answer, use it and be specific.
  2. If the context is missing info, use your general knowledge about Leoism/Lions but mention it's general info.
  3. Never reveal internal "Admin Only" data to "Public" or "Member" roles.
  4. User is asking as a: ${userRole.toUpperCase()}.
  5. Keep responses well-structured and concise.
  
  Current User Query: ${userQuery}`;

  try {
    // 4. Secure API Call
    const aiResponse = await callGeminiWithRetry(userQuery, systemPrompt);
    
    if (!aiResponse) throw new Error("LEO AI returned an empty response.");

    // 5. Track used sources
    const usedSources = context
        .filter(c => aiResponse.toLowerCase().includes(c.title.toLowerCase()))
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
