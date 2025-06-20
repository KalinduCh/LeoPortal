
// src/app/actions/communicationActions.ts
"use server";

import { z } from "zod";
import { getFunctions, httpsCallable, type HttpsCallableResult } from 'firebase/functions';
import { app } from '@/lib/firebase/clientApp'; // Ensure your clientApp initializes Firebase

const sendBulkEmailSchema = z.object({
  recipientEmails: z.array(z.string().email()),
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
// It's important that 'app' is the initialized Firebase app instance
const functions = getFunctions(app); 
// Create a reference to the Firebase Function
// The name 'sendBulkEmail' must match the exported name in your functions/src/index.ts
const sendBulkEmailCallable = httpsCallable(functions, 'sendBulkEmail');


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
        recipientEmails: fieldErrors.recipientEmails,
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
    const result: HttpsCallableResult<any> = await sendBulkEmailCallable({ 
        recipientEmails: validEmails, 
        subject: validSubject, 
        body: validBody 
    });

    // The 'result.data' will contain whatever your Firebase Function returns on success.
    // Based on the example function, it returns { success: true, message: '...' }
    const functionResponse = result.data as { success: boolean, message: string };

    if (functionResponse.success) {
      return {
        success: true,
        message: functionResponse.message || `Email request processed for ${validEmails.length} recipient(s).`,
      };
    } else {
      return {
        success: false,
        message: functionResponse.message || "The email function reported an issue.",
        errors: { general: functionResponse.message || "Failed to send emails via cloud function." }
      };
    }

  } catch (error: any) {
    console.error("Error calling sendBulkEmail Firebase Function:", error);
    // Firebase HttpsError has a 'code' and 'message' property
    // Default to a generic error message if details aren't available
    const errorMessage = error.message || "An unexpected error occurred while trying to send emails.";
    return {
      success: false,
      message: `Failed to process email request: ${errorMessage}`,
      errors: { general: `Function call failed: ${errorMessage.substring(0,100)}...` }
    };
  }
}
