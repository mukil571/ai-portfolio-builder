import { z } from "zod";

const email = z.email("Enter a valid email address.").trim().toLowerCase();
const password = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(128, "Use at most 128 characters.");

export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80, "Keep it under 80 characters."),
  email,
  password,
});

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Passwords don't match.",
  });
