'use server';

/**
 * @fileOverview Secure Server Actions for LEO AI with Retrieval-Augmented Generation (RAG).
 */

import { adminDb } from '@/lib/firebase/admin/config';
import { callGeminiSimple } from '@/ai/model-selector';
import type { AiKnowledge, AiKnowledgeVisibility, AiMessage } from '@/types/leo-ai';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Fetches knowledge context grounded in user role.
 */
async function getFilteredContext(userRole: 'public' | 'member' | 'admin'): Promise<AiKnowledge[]> {
  try {
    const allowedVisibilities: AiKnowledgeVisibility[] = ['public'];
    if (userRole === 'member' || userRole === 'admin') allowedVisibilities.push('members');
    if (userRole === 'admin') allowedVisibilities.push('admin_only');

    // Simplified retrieval for Free Tier: fetch most recent active documents
    const snapshot = await adminDb().collection('leo_ai_knowledge')
      .where('isActive', '==', true)
      .orderBy('updatedAt', 'desc')
      .limit(20)
      .get();
    
    const allKnowledge = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AiKnowledge));
    return allKnowledge.filter(k => allowedVisibilities.includes(k.visibility));
  } catch (error) {
    console.error("LEO_AI_CONTEXT_RETRIEVAL_ERROR:", error);
    return [];
  }
}

/**
 * Core AI Agent logic with context grounding and persistence.
 */
export async function askLeoAiAction(
  userQuery: string, 
  userRole: 'public' | 'member' | 'admin',
  conversationId: string,
  userId?: string,
  history: AiMessage[] = []
): Promise<{ answer: string; sources: { title: string; id: string }[] }> {
  
  if (!process.env.GOOGLE_GENAI_API_KEY) {
      throw new Error("LEO AI Offline — AI Assistant Configuration Error: Missing API Key.");
  }

  // 1. Retrieve role-based context
  const context = await getFilteredContext(userRole);
  const contextString = context.map(c => `DOCUMENT [${c.title}]:\n${c.content}`).join('\n\n');
  
  // 2. Format history for context-aware generation
  const historyString = history
    .slice(-4)
    .map(m => `${m.role === 'user' ? 'Member' : 'LEO AI'}: ${m.content}`)
    .join('\n');

  // 3. Construct grounded system prompt
  const systemPrompt = `You are LEO AI, the official intelligent assistant for the Leo Club of Athugalpura.
  Your goal is to provide accurate information based on the provided club documents.
  
  CLUB DOCUMENTS:
  ${contextString || 'No official documents found for this query.'}
  
  CONVERSATION HISTORY:
  ${historyString}
  
  GUIDELINES:
  - Base your answers ONLY on the CLUB DOCUMENTS if the information is specific to the club.
  - If the answer is not in the documents, state: "I'm sorry, I don't have official information on that specific topic in my knowledge base. You may contact a club officer for more details."
  - Be professional, welcoming, and concise.
  - User role is: ${userRole.toUpperCase()}. Never disclose "Admin Only" info if the role is MEMBER or PUBLIC.`;

  try {
    // 4. Generate Answer via standard generateContent bridge
    const aiResponse = await callGeminiSimple(userQuery, systemPrompt);
    
    if (!aiResponse) throw new Error("LEO AI returned an empty response.");

    // 5. Detect Sources mentioned in response
    const usedSources = context
        .filter(c => aiResponse.toLowerCase().includes(c.title.toLowerCase().substring(0, 8)))
        .map(c => ({ title: c.title, id: c.id }));

    // 6. Persist Conversation if ID is provided
    if (conversationId && userId) {
        const chatRef = adminDb().collection('leo_ai_conversations').doc(conversationId);
        const userMsg: AiMessage = { id: `u-${Date.now()}`, role: 'user', content: userQuery, timestamp: new Date().toISOString() };
        const assistantMsg: AiMessage = { id: `a-${Date.now()}`, role: 'assistant', content: aiResponse, sources: usedSources, timestamp: new Date().toISOString() };
        
        await chatRef.set({
            userId,
            userType: userRole,
            messages: [...history, userMsg, assistantMsg].slice(-20), 
            lastMessageAt: Timestamp.now()
        }, { merge: true });
    }

    return {
      answer: aiResponse,
      sources: usedSources
    };
  } catch (error: any) {
    console.error("LEO_AI_GENERATION_ERROR:", error);
    throw new Error(error.message || "LEO AI is temporarily unavailable. Please try again later.");
  }
}

/**
 * Loads a previous conversation for the user.
 */
export async function getLeoAiConversationAction(conversationId: string, userId: string) {
    const snap = await adminDb().collection('leo_ai_conversations').doc(conversationId).get();
    if (!snap.exists) return null;
    const data = snap.data();
    if (data?.userId !== userId) throw new Error("Unauthorized access to conversation.");
    return data;
}
