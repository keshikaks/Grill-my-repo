import { z } from "zod";

export const RegisterInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters.")
      .max(64, "Name must be under 64 characters."),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Please provide a valid email address."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(128, "Password must be under 128 characters.")
      .regex(
        /[0-9]/,
        "Password must contain at least one number."
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const LoginInputSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please provide a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export const ResetPasswordRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please provide a valid email address."),
});

export const ResetPasswordConfirmSchema = z
  .object({
    token: z.string().min(1, "Reset token is required."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(128, "Password must be under 128 characters.")
      .regex(
        /[0-9]/,
        "Password must contain at least one number."
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof RegisterInputSchema>;
export type LoginInput = z.infer<typeof LoginInputSchema>;
export type ResetPasswordRequestInput = z.infer<
  typeof ResetPasswordRequestSchema
>;
export type ResetPasswordConfirmInput = z.infer<
  typeof ResetPasswordConfirmSchema
>;
