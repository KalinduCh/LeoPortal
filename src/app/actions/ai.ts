
// src/app/actions/ai.ts
"use server";

import { z } from "zod";
import { answerScheduleQuestions, type AnswerScheduleQuestionsInput } from "@/ai/flows/answer-schedule-questions";
import { answerProfileUpdateQuestions, type AnswerProfileUpdateQuestionsInput } from "@/ai/flows/answer-profile-update-questions";
import { getEvents } from "@/services/eventService"; 
import { isValid, parseISO } from 'date-fns';

const aiQuerySchema = z.object({
  question: z.string().min(1, "Question cannot be empty."),
  context: z.enum(["schedule", "profile"]),
});

export interface AiQueryState {
  answer?: string;
  error?: string;
}

export async function handleAiQuery(
  prevState: AiQueryState | undefined,
  formData: FormData
): Promise<AiQueryState> {
  const validatedFields = aiQuerySchema.safeParse({
    question: formData.get("question"),
    context: formData.get("context"),
  });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.flatten().fieldErrors.question?.[0] || 
             validatedFields.error.flatten().fieldErrors.context?.[0] || 
             "Invalid input.",
    };
  }

  const { question, context } = validatedFields.data;

  try {
    if (context === "schedule") {
      const liveEvents = await getEvents();
      const eventsString = liveEvents
        .map(e => {
          if (!e.startDate || !isValid(parseISO(e.startDate))) return "Unnamed event at an unspecified date/location.";
          return `${e.name} on ${new Date(e.startDate).toLocaleDateString()} at ${e.location}. Description: ${e.description}`;
        })
        .join("\n");
      
      const input: AnswerScheduleQuestionsInput = { question, events: eventsString };
      const result = await answerScheduleQuestions(input);
      return { answer: result.answer };

    } else if (context === "profile") {
      const input: AnswerProfileUpdateQuestionsInput = { question };
      const result = await answerProfileUpdateQuestions(input);
      return { answer: result.answer };
    } else {
      return { error: "Invalid query context." };
    }
  } catch (err) {
    console.error("AI Query Error:", err);
    const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred with the AI assistant.";
    return { error: `Failed to get answer from AI: ${errorMessage}` };
  }
}
