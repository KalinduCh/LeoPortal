
// src/app/actions/communicationActions.ts
"use server";

import { z } from "zod";
import { getFunctions, httpsCallable, type HttpsCallableResult, type FunctionsError } from 'firebase/functions';
import { app } from '@/lib/firebase/clientApp'; // Ensure your clientApp initializes Firebase

const sendBulkEmailSchema = z.object({
  recipientEmails: z.array(z.string().email({ message: "Invalid email address in list." })).min(1, "At least one recipient email is required."),
  subject: z.string().min(1, "Subject cannot be empty."),
  body: z.string().min(1, "Email body cannot be empty."),
});

export interface SendBulkEmailState {
  success: boolean;
  message: string;
  errors?: {
    recipientEmails?: string[];
    subject?: string[];
    body?: string[];
    general?: string;
  };
}

// Initialize Firebase Functions
const functions = getFunctions(app); 
// Create a reference to the Firebase Function
// The name 'sendBulkEmail' must match the exported name in your functions/src/index.ts
const sendBulkEmailCallable = httpsCallable<{recipientEmails: string[], subject: string, body: string}, {success: boolean, message: string}>(functions, 'sendBulkEmail');


export async function sendBulkEmailAction(
  prevState: SendBulkEmailState,
  formData: FormData
): Promise<SendBulkEmailState> {
  
  const recipientEmails = formData.getAll("recipientEmails") as string[];
  const subject = formData.get("subject") as string;
  const body = formData.get("body") as string;

  const validatedFields = sendBulkEmailSchema.safeParse({
    recipientEmails,
    subject,
    body,
  });

  if (!validatedFields.success) {
    const fieldErrors = validatedFields.error.flatten().fieldErrors;
    return {
      success: false,
      message: "Invalid input. Please check the fields.",
      errors: {
        // Ensure that array errors are handled correctly for recipientEmails
        recipientEmails: fieldErrors.recipientEmails ? fieldErrors.recipientEmails.map(e => String(e)) : undefined,
        subject: fieldErrors.subject,
        body: fieldErrors.body,
      },
    };
  }

  const { 
    recipientEmails: validEmails, 
    subject: validSubject, 
    body: validBody 
  } = validatedFields.data;

  try {
    // Call the Firebase Function
    const result = await sendBulkEmailCallable({ 
        recipientEmails: validEmails, 
        subject: validSubject, 
        body: validBody 
    });

    // The 'result.data' will contain whatever your Firebase Function returns on success.
    // Based on the example function, it returns { success: true, message: '...' }
    const functionResponse = result.data; // Type is {success: boolean, message: string} due to httpsCallable generic

    if (functionResponse.success) {
      return {
        success: true,
        message: functionResponse.message || `Email request processed for ${validEmails.length} recipient(s).`,
      };
    } else {
      // This case might not be hit if the function throws HttpsError for failures
      return {
        success: false,
        message: functionResponse.message || "The email function reported an issue but didn't throw an error.",
        errors: { general: functionResponse.message || "Failed to send emails via cloud function." }
      };
    }

  } catch (error: any) {
    console.error("Error calling 'sendBulkEmail' Firebase Function:", error);
    
    let errorMessage = "An unexpected error occurred while trying to send emails.";
    if (error instanceof Error) {
        errorMessage = error.message; // General JS error
    }

    // Handle Firebase Functions specific HttpsError
    // Error codes can be: 'ok', 'cancelled', 'unknown', 'invalid-argument', 'deadline-exceeded',
    // 'not-found', 'already-exists', 'permission-denied', 'resource-exhausted', 
    // 'failed-precondition', 'aborted', 'out-of-range', 'unimplemented', 'internal',
    // 'unavailable', 'data-loss', 'unauthenticated'
    const httpsError = error as FunctionsError; // Type assertion
    if (httpsError.code && httpsError.message) {
        errorMessage = `Function Error (${httpsError.code}): ${httpsError.message}`;
    }

    return {
      success: false,
      message: `Failed to process email request. ${errorMessage}`,
      errors: { general: `Function call failed: ${errorMessage.substring(0,150)}... Check server logs for details.` }
    };
  }
}

