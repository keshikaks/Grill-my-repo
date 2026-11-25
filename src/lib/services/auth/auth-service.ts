import { prisma } from "../../db.ts";
import { hashPassword, verifyPassword } from "./password.ts";
import { createSessionToken } from "./jwt.ts";
import type {
  RegisterInput,
  LoginInput,
  ResetPasswordConfirmInput,
} from "../../validation/auth.ts";

export class AuthError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode = 400) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export async function registerUser(input: RegisterInput): Promise<{
  user: { id: string; name: string; email: string };
  token: string;
}> {
  const normalizedEmail = input.email.toLowerCase().trim();

  // Check duplicate email
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    throw new AuthError(
      "An account with this email address already exists. Please log in instead.",
      "EMAIL_EXISTS",
      409
    );
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email: normalizedEmail,
      passwordHash,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  const token = await createSessionToken({
    userId: user.id,
    email: user.email,
    name: user.name,
  });

  // Also persist session record in database
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: {
      userId: user.id,
      sessionToken: token,
      expires,
    },
  });

  return { user, token };
}

export async function loginUser(input: LoginInput): Promise<{
  user: { id: string; name: string; email: string };
  token: string;
}> {
  const normalizedEmail = input.email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw new AuthError(
      "Invalid email or password. Please verify your credentials and try again.",
      "INVALID_CREDENTIALS",
      401
    );
  }

  const isValid = await verifyPassword(input.password, user.passwordHash);
  if (!isValid) {
    throw new AuthError(
      "Invalid email or password. Please verify your credentials and try again.",
      "INVALID_CREDENTIALS",
      401
    );
  }

  const token = await createSessionToken({
    userId: user.id,
    email: user.email,
    name: user.name,
  });

  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: {
      userId: user.id,
      sessionToken: token,
      expires,
    },
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    token,
  };
}

export async function logoutUser(token?: string): Promise<void> {
  if (token) {
    try {
      await prisma.session.deleteMany({
        where: { sessionToken: token },
      });
    } catch {
      // Ignore cleanup error
    }
  }
}

export async function requestPasswordReset(email: string): Promise<{
  success: boolean;
  message: string;
  emailConfigured: boolean;
  token?: string;
}> {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    // Avoid user enumeration
    return {
      success: true,
      message: "If an account matches this email, reset instructions have been issued.",
      emailConfigured: Boolean(process.env.SMTP_SERVER || process.env.RESEND_API_KEY),
    };
  }

  // Generate 32-byte hex token
  const token = Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: {
      email: normalizedEmail,
      token,
      expiresAt,
    },
  });

  const emailConfigured = Boolean(process.env.SMTP_SERVER || process.env.RESEND_API_KEY);

  return {
    success: true,
    message: "If an account matches this email, reset instructions have been issued.",
    emailConfigured,
    token: process.env.NODE_ENV !== "production" ? token : undefined,
  };
}

export async function confirmPasswordReset(
  input: ResetPasswordConfirmInput
): Promise<void> {
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token: input.token },
  });

  if (!resetToken || resetToken.expiresAt < new Date()) {
    throw new AuthError(
      "Password reset token is invalid or has expired. Please request a new link.",
      "EXPIRED_TOKEN",
      400
    );
  }

  const passwordHash = await hashPassword(input.password);

  await prisma.user.update({
    where: { email: resetToken.email },
    data: { passwordHash },
  });

  // Delete used token and invalidate existing sessions
  await prisma.passwordResetToken.delete({
    where: { id: resetToken.id },
  });

  await prisma.session.deleteMany({
    where: { user: { email: resetToken.email } },
  });
}
