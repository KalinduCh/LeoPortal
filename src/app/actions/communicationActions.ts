
// src/app/actions/communicationActions.ts
"use server";

import { z } from "zod";

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

  // --- !!! IMPORTANT DEVELOPMENT NOTE !!! ---
  // This section SIMULATES sending emails.
  // In a real application, you would replace this with a call to a Firebase Function
  // which then uses an email service (e.g., SendGrid, Mailgun, Resend) to send emails.
  // Directly sending emails from a Next.js Server Action is not recommended for production
  // due to potential security risks (exposing API keys) and limitations.
  
  console.log("--- SIMULATING EMAIL SEND ---");
  console.log("Recipients:", validEmails.join(", "));
  console.log("Subject:", validSubject);
  console.log("Body:\n", validBody);
  console.log("--- END OF SIMULATION ---");

  // Simulate a delay as if an API call was made
  await new Promise(resolve => setTimeout(resolve, 1000));

  // For now, assume success
  return {
    success: true,
    message: `Email successfully processed for ${validEmails.length} recipient(s). (Simulation Complete - Check server console for details)`,
  };

  // Example of how error handling might look if the (simulated) call failed:
  // return {
  //   success: false,
  //   message: "The email service provider returned an error.",
  //   errors: { general: "Failed to send emails via provider." }
  // };
}

    