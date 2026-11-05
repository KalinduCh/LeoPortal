'use server';

/**
 * @fileOverview LEO AI Server Action: Full-Context Expert Engine.
 * Retrieves all relevant club knowledge for zero-cost, high-accuracy responses.
 */

import { adminDb } from '@/lib/firebase/admin/config';
import { runWithAiSimple } from '@/ai/model-selector';
import type { AiKnowledge, AiKnowledgeVisibility, AiMessage } from '@/types/leo-ai';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Retrieves the full knowledge base accessible to the user's role.
 */
async function getRoleBasedKnowledgeBase(userRole: 'public' | 'member' | 'admin'): Promise<string> {
  try {
    const allowedVisibilities: AiKnowledgeVisibility[] = ['public'];
    if (userRole === 'member' || userRole === 'admin') allowedVisibilities.push('members');
    if (userRole === 'admin') allowedVisibilities.push('admin_only');

    // Fetch all active knowledge documents (up to 100 - effectively the whole brain)
    const snapshot = await adminDb().collection('leo_ai_knowledge')
      .where('isActive', '==', true)
      .limit(100)
      .get();
    
    const relevantDocs = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() } as AiKnowledge))
      .filter(k => allowedVisibilities.includes(k.visibility));

    if (relevantDocs.length === 0) return "No official documents are available for your role currently.";

    return relevantDocs
      .map(doc => `[FACT: ${doc.title}]\n${doc.content}`)
      .join('\n\n---\n\n');
  } catch (error) {
    console.error("LEO_AI_KNOWLEDGE_FETCH_ERROR:", error);
    return "The club knowledge base is temporarily unreachable.";
  }
}

/**
 * Core AI Processing Logic.
 */
export async function askLeoAiAction(
  userQuery: string, 
  userRole: 'public' | 'member' | 'admin',
  conversationId: string,
  userId?: string,
  history: AiMessage[] = []
): Promise<{ answer: string; sources: { title: string; id: string }[] }> {
  
  if (!process.env.GOOGLE_GENAI_API_KEY) {
      throw new Error("LEO AI Offline: Missing API Key.");
  }

  // 1. Fetch the entire applicable "Club Manual" for this role
  const manualContext = await getRoleBasedKnowledgeBase(userRole);
  
  // 2. Format history for contextual continuity
  const historyString = history
    .slice(-6) // Keep last 3 turns for context
    .map(m => `${m.role === 'user' ? 'Member' : 'LEO AI'}: ${m.content}`)
    .join('\n');

  // 3. Construct the Grounded Expert Prompt
  const systemPrompt = `You are LEO AI, the official intelligent assistant for the Leo Club of Athugalpura.
  You are an expert on the club because you have access to the "OFFICIAL CLUB MANUAL" provided below.
  
  OFFICIAL CLUB MANUAL:
  ${manualContext}
  
  CONVERSATION HISTORY:
  ${historyString || 'New conversation started.'}
  
  YOUR RULES:
  - Base your answers ONLY on the OFFICIAL CLUB MANUAL for club-specific information.
  - For general Leoism or Lions information not in the manual, you may use your general knowledge, but prioritize the manual.
  - If a specific club fact (date, name, procedure) is NOT in the manual, say: "I'm sorry, I don't have official records on that specific topic in my current knowledge base."
  - NEVER make up facts about the Leo Club of Athugalpura.
  - Your tone is: Professional, Helpful, and Proud of the club.
  - The current user's access level is: ${userRole.toUpperCase()}.`;

  try {
    // 4. Generate the response
    const aiResponse = await runWithAiSimple(userQuery, systemPrompt);
    
    if (!aiResponse) throw new Error("LEO AI returned an empty response.");

    // 5. Detect used sources (simple keyword match against the manual)
    const sources = manualContext.includes("[FACT:") 
        ? manualContext.split("---").filter(s => aiResponse.toLowerCase().includes(s.split("]")[0].replace("[FACT:", "").trim().toLowerCase().substring(0, 8)))
            .map(s => {
                const title = s.split("]")[0].replace("[FACT:", "").trim();
                return { title, id: title.toLowerCase().replace(/\s+/g, '-') };
            })
        : [];

    // 6. Persistence
    if (conversationId && userId) {
        const chatRef = adminDb().collection('leo_ai_conversations').doc(conversationId);
        const userMsg: AiMessage = { id: `u-${Date.now()}`, role: 'user', content: userQuery, timestamp: new Date().toISOString() };
        const assistantMsg: AiMessage = { id: `a-${Date.now()}`, role: 'assistant', content: aiResponse, sources, timestamp: new Date().toISOString() };
        
        await chatRef.set({
            userId,
            userType: userRole,
            messages: [...history, userMsg, assistantMsg].slice(-30), // Retain last 15 turns
            lastMessageAt: Timestamp.now()
        }, { merge: true });
    }

    return { answer: aiResponse, sources };
  } catch (error: any) {
    console.error("LEO_AI_GEN_ERROR:", error);
    throw new Error(error.message || "I'm currently busy with other members. Please try again in a few seconds.");
  }
}

export async function getLeoAiConversationAction(conversationId: string, userId: string) {
    const snap = await adminDb().collection('leo_ai_conversations').doc(conversationId).get();
    if (!snap.exists) return null;
    const data = snap.data();
    if (data?.userId !== userId) return null;
    return data;
}
