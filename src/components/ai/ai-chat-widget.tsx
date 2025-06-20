// src/components/ai/ai-chat-widget.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot, User, Send, Loader2, AlertTriangle, Info, CalendarDays, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { handleAiQuery, type AiQueryState } from "@/app/actions/ai";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai" | "error";
}

const initialState: AiQueryState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="icon" aria-label="Send message" disabled={pending}>
      {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
    </Button>
  );
}

export function AiChatWidget() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentContext, setCurrentContext] = useState<"schedule" | "profile">("schedule");
  const formRef = useRef<HTMLFormElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const [state, formAction] = useFormState(handleAiQuery, initialState);

  useEffect(() => {
    if (state?.answer) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), text: state.answer!, sender: "ai" },
      ]);
    } else if (state?.error) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), text: state.error!, sender: "error" },
      ]);
    }
  }, [state]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSubmit = async (formData: FormData) => {
    const question = formData.get("question") as string;
    if (!question.trim()) return;

    setMessages((prev) => [
      ...prev,
      { id: (Date.now() -1).toString(), text: question, sender: "user" },
    ]);
    
    formData.set("context", currentContext); // Ensure context is part of form data for server action
    formAction(formData);
    formRef.current?.reset();
  };

  return (
    <div className="flex flex-col h-[500px] w-full rounded-lg border bg-card shadow-sm">
      <div className="p-4 border-b">
          <Tabs defaultValue="schedule" onValueChange={(value) => setCurrentContext(value as "schedule" | "profile")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="schedule">
                <CalendarDays className="mr-2 h-4 w-4" /> Schedule
              </TabsTrigger>
              <TabsTrigger value="profile">
                <UserCircle className="mr-2 h-4 w-4" /> Profile Updates
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Ask about {currentContext === "schedule" ? "event times, locations, or details." : "how to update your profile information."}
          </p>
        </div>
      <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Bot className="h-12 w-12 mb-2" />
              <p>Ask me anything about schedules or profile updates!</p>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex items-start gap-3",
                msg.sender === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.sender !== "user" && (
                <Avatar className="h-8 w-8 border-2 border-primary/50">
                  <AvatarImage src="/placeholder-bot.png" alt="AI" data-ai-hint="robot avatar" />
                  <AvatarFallback className={cn(msg.sender === "error" ? "bg-destructive" : "bg-primary")}>
                    {msg.sender === "error" ? <AlertTriangle className="text-destructive-foreground" /> : <Bot className="text-primary-foreground" />}
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  "max-w-[70%] rounded-lg p-3 text-sm shadow",
                  msg.sender === "user"
                    ? "bg-primary text-primary-foreground"
                    : msg.sender === "ai"
                    ? "bg-muted text-muted-foreground"
                    : "bg-destructive text-destructive-foreground"
                )}
              >
                {msg.text}
              </div>
              {msg.sender === "user" && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-accent text-accent-foreground"><User /></AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
      <form
        ref={formRef}
        action={handleSubmit}
        className="flex items-center gap-2 border-t p-4"
      >
        <Input
          name="question"
          placeholder={`Ask about ${currentContext}...`}
          className="flex-grow"
          autoComplete="off"
          required
        />
        <input type="hidden" name="context" value={currentContext} />
        <SubmitButton />
      </form>
    </div>
  );
}
