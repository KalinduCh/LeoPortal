
// src/app/actions/communicationActions.ts
"use server";

import { z } from "zod";

// No Firebase Functions imports needed for simulation

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

  // --- Simulation for Spark Plan ---
  console.log("--- SIMULATING EMAIL SEND ---");
  console.log("Recipients:", validEmails.join(", "));
  console.log("Subject:", validSubject);
  console.log("Body:", validBody);
  console.log("--- END OF SIMULATION ---");
  // --- End of Simulation ---

  // In a real scenario on a paid plan, you would call a Firebase Function here.
  // For example:
  // try {
  //   const functions = getFunctions(app); // app from firebase/clientApp
  //   const sendBulkEmailCallable = httpsCallable(functions, 'sendBulkEmail');
  //   const result = await sendBulkEmailCallable({ recipientEmails: validEmails, subject: validSubject, body: validBody });
  //   const functionResponse = result.data as { success: boolean, message: string };
  //   if (functionResponse.success) {
  //     return { success: true, message: functionResponse.message || `Email request processed for ${validEmails.length} recipient(s).` };
  //   } else {
  //     return { success: false, message: functionResponse.message || "The email function reported an issue.", errors: { general: functionResponse.message }};
  //   }
  // } catch (error: any) {
  //   console.error("Error calling 'sendBulkEmail' Firebase Function:", error);
  //   const errorMessage = error.message || "An unexpected error occurred while trying to send emails.";
  //   return { success: false, message: `Failed to process email request. ${errorMessage}`, errors: { general: `Function call failed: ${errorMessage.substring(0,150)}...` }};
  // }

  return {
    success: true,
    message: `Email content for ${validEmails.length} recipient(s) logged to server console (Simulation Mode). Actual sending requires a paid Firebase plan.`,
  };
}
