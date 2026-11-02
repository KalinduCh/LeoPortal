
export type AiKnowledgeCategory = 
  | 'club_history' 
  | 'club_leadership' 
  | 'club_projects' 
  | 'club_awards' 
  | 'club_constitution' 
  | 'leoism' 
  | 'lions_international' 
  | 'leadership_development' 
  | 'community_service' 
  | 'general';

export type AiKnowledgeVisibility = 'public' | 'members' | 'admin_only';

export interface AiKnowledge {
  id: string;
  title: string;
  content: string;
  category: AiKnowledgeCategory;
  visibility: AiKnowledgeVisibility;
  isActive: boolean;
  sourceUrl?: string;
  tags?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: { title: string; id: string }[];
}

export interface AiConversation {
  id: string;
  userId?: string;
  userType: 'public' | 'member' | 'admin';
  messages: AiMessage[];
  lastMessageAt: string;
}

export interface AiAnalytics {
  totalQuestions: number;
  unansweredQuestions: number;
  topTopics: { topic: string; count: number }[];
}
