"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
    BrainCircuit, X, Minimize2, Maximize2, Send, 
    Loader2, Sparkles, HelpCircle, Trash2, Globe, Shield, User
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import type { AiMessage } from '@/types/leo-ai';
import { askLeoAi } from '@/services/leoAiService';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

const SUGGESTED_QUESTIONS = [
    "Tell me about our club.",
    "What is Leoism?",
    "Who are Lions?",
    "What are the responsibilities of a Leo President?",
    "Tell me about our club's achievements."
];

export function LeoAIWidget() {
    const { user } = useAuth();
    const { toast } = useToast();
    
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<AiMessage[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: "Hello! I'm LEO AI, your intelligent LeoPortal assistant. Ask me anything about our club, Leoism, Lions International, leadership or community service. I'm here to help!",
            timestamp: new Date().toISOString()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const scrollAnchorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollAnchorRef.current) {
            scrollAnchorRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isLoading]);

    const handleSend = async (text: string = input) => {
        if (!text.trim() || isLoading) return;

        const userMsg: AiMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: text,
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const role = user ? (user.role === 'admin' || user.role === 'super_admin' ? 'admin' : 'member') : 'public';
            
            // Pass the current message history to the AI for context
            const response = await askLeoAi(text, role, messages);

            if (!response || !response.answer) {
                throw new Error("No answer received from LEO AI.");
            }

            const aiMsg: AiMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response.answer,
                sources: response.sources,
                timestamp: new Date().toISOString()
            };

            setMessages(prev => [...prev, aiMsg]);
        } catch (error: any) {
            console.error("CHAT_WIDGET_ERROR:", error);
            toast({ 
                title: "LEO AI Offline", 
                description: error.message || "An unexpected error occurred. Please try again.", 
                variant: "destructive" 
            });
            // Remove the user's last message if it failed significantly, or just stop loading
        } finally {
            setIsLoading(false);
        }
    };

    const clearChat = () => {
        if (confirm("Clear current conversation?")) {
            setMessages([messages[0]]);
        }
    };

    if (!isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 h-16 w-16 rounded-full bg-primary text-white shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 z-50 flex items-center justify-center group border-4 border-white/20"
            >
                <BrainCircuit className="h-8 w-8 group-hover:animate-pulse" />
                <div className="absolute -top-1 -right-1 h-5 w-5 bg-amber-400 rounded-full flex items-center justify-center border-2 border-white">
                    <Sparkles className="h-3 w-3 text-white" />
                </div>
            </button>
        );
    }

    return (
        <Card className={cn(
            "fixed bottom-6 right-6 w-[calc(100vw-3rem)] sm:w-[400px] z-50 border-none shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] bg-white rounded-[2rem] overflow-hidden transition-all duration-500 flex flex-col",
            isMinimized ? "h-16" : "h-[600px] max-h-[calc(100vh-8rem)]"
        )}>
            {/* Header */}
            <CardHeader className="bg-slate-900 p-5 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                        <BrainCircuit className="h-6 w-6" />
                    </div>
                    <div>
                        <CardTitle className="text-white text-lg font-black tracking-tight uppercase leading-none">LEO AI</CardTitle>
                        <div className="flex items-center gap-1.5 mt-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Intelligent Assistant</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white" onClick={() => setIsMinimized(!isMinimized)}>
                        {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-500" onClick={() => setIsOpen(false)}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>
            </CardHeader>

            {!isMinimized && (
                <>
                    {/* Chat Area */}
                    <CardContent className="flex-1 overflow-hidden p-0 flex flex-col bg-slate-50/30">
                        <ScrollArea className="flex-1 px-5 pt-6 pb-4">
                            <div className="space-y-6">
                                {messages.map((msg) => (
                                    <div key={msg.id} className={cn(
                                        "flex gap-3 max-w-[85%]",
                                        msg.role === 'user' ? "ml-auto flex-row-reverse text-right" : "mr-auto text-left"
                                    )}>
                                        <div className={cn(
                                            "h-8 w-8 rounded-xl flex-shrink-0 flex items-center justify-center shadow-sm",
                                            msg.role === 'assistant' ? "bg-slate-900 text-primary" : "bg-primary text-white"
                                        )}>
                                            {msg.role === 'assistant' ? <BrainCircuit className="h-4 w-4" /> : <User className="h-4 w-4" />}
                                        </div>
                                        <div className="space-y-2">
                                            <div className={cn(
                                                "p-4 rounded-2xl text-sm leading-relaxed shadow-sm ring-1",
                                                msg.role === 'assistant' 
                                                    ? "bg-white ring-slate-100 text-slate-700" 
                                                    : "bg-primary ring-primary/10 text-white font-medium"
                                            )}>
                                                {msg.content}
                                            </div>
                                            {msg.sources && msg.sources.length > 0 && (
                                                <div className="flex flex-wrap gap-2 pt-1">
                                                    {msg.sources.map(s => (
                                                        <Badge key={s.id} variant="outline" className="text-[9px] font-black border-slate-200 text-slate-400 bg-white">
                                                            REF: {s.title}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex gap-3 max-w-[80%]">
                                        <div className="h-8 w-8 rounded-xl bg-slate-900 text-primary flex items-center justify-center animate-pulse shadow-sm">
                                            <BrainCircuit className="h-4 w-4" />
                                        </div>
                                        <div className="p-4 rounded-2xl bg-white ring-1 ring-slate-100 flex items-center gap-2 shadow-sm">
                                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">LEO AI is thinking...</span>
                                        </div>
                                    </div>
                                )}
                                <div ref={scrollAnchorRef} />
                            </div>
                        </ScrollArea>

                        {/* Suggestions */}
                        {messages.length < 3 && !isLoading && (
                            <div className="px-5 py-3 overflow-x-auto whitespace-nowrap hide-scrollbar flex gap-2 border-t bg-white/50">
                                {SUGGESTED_QUESTIONS.map((q) => (
                                    <button 
                                        key={q} 
                                        onClick={() => handleSend(q)}
                                        className="inline-flex items-center px-3 py-1.5 rounded-full bg-white border border-slate-200 text-[10px] font-bold text-slate-600 hover:border-primary hover:text-primary transition-all shadow-sm"
                                    >
                                        <HelpCircle className="h-3 w-3 mr-1.5" /> {q}
                                    </button>
                                ))}
                            </div>
                        )}
                    </CardContent>

                    {/* Input Area */}
                    <div className="p-5 bg-white border-t border-slate-100">
                        <div className="flex items-center gap-2 relative">
                            <Input 
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Ask LEO AI something..."
                                className="h-12 rounded-2xl pr-12 bg-slate-50 border-none ring-1 ring-slate-100 focus-visible:ring-primary/20 placeholder:text-slate-400"
                                disabled={isLoading}
                            />
                            <button 
                                onClick={() => handleSend()}
                                disabled={!input.trim() || isLoading}
                                className="absolute right-2 h-8 w-8 rounded-xl bg-primary text-white flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-30 disabled:scale-100 transition-all shadow-lg"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center gap-3">
                                {user ? (
                                    <div className="flex items-center gap-1.5 text-[9px] font-black text-primary uppercase tracking-widest">
                                        <Shield className="h-2.5 w-2.5" /> Authenticated
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        <Globe className="h-2.5 w-2.5" /> Public Access
                                    </div>
                                )}
                            </div>
                            <button 
                                onClick={clearChat}
                                className="text-[9px] font-black text-slate-300 uppercase tracking-widest hover:text-rose-500 flex items-center gap-1 transition-colors"
                            >
                                <Trash2 className="h-2.5 w-2.5" /> Clear History
                            </button>
                        </div>
                    </div>
                </>
            )}
        </Card>
    );
}
