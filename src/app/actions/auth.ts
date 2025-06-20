// src/app/actions/auth.ts
"use server";

import { z } from "zod";
// In a real app, you'd use your actual auth provider (e.g., Firebase Admin SDK, database calls)
// For this mock, we don't have a persistent backend user store accessible here directly for signup.
// The useAuth hook handles localStorage for client-side session.
// These server actions are more for validating input and would typically interact with a backend.

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function loginAction(prevState: any, formData: FormData) {
  try {
    const validatedFields = loginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!validatedFields.success) {
      return {
        message: "Invalid fields.",
        errors: validatedFields.error.flatten().fieldErrors,
        success: false,
      };
    }
    // Mock: In a real app, you'd verify credentials against a database.
    // The actual setting of the user session is handled client-side by useAuth after this action returns success.
    // Here we just simulate a successful validation.
    // To simulate a failed login, you can check against mockUsers if needed, but the actual login logic is in useAuth.
    
    // This server action's role is primarily validation and perhaps some server-side checks.
    // The client will then use the validated data to call `auth.login()`.
    return { message: "Validation successful. Proceeding with login.", success: true, data: validatedFields.data };

  } catch (error) {
    return { message: "Login failed. Please try again.", success: false };
  }
}

export async function signupAction(prevState: any, formData: FormData) {
 try {
    const validatedFields = signupSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!validatedFields.success) {
      return {
        message: "Invalid fields.",
        errors: validatedFields.error.flatten().fieldErrors,
        success: false,
      };
    }
    // Mock: In a real app, you'd create a new user in your database.
    // The client will then use the validated data to call `auth.signup()`.
    return { message: "Validation successful. Proceeding with signup.", success: true, data: validatedFields.data };

  } catch (error) {
    return { message: "Signup failed. Please try again.", success: false };
  }
}
