import { NextResponse } from "next/server";
import {
  ResetPasswordRequestSchema,
  ResetPasswordConfirmSchema,
} from "@/lib/validation/auth";
import {
  requestPasswordReset,
  confirmPasswordReset,
  AuthError,
} from "@/lib/services/auth/auth-service";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Check if confirming reset (has token)
    if (body.token) {
      const parsed = ResetPasswordConfirmSchema.safeParse(body);
      if (!parsed.success) {
        const firstError = parsed.error.issues[0]?.message ?? "Invalid reset request.";
        return NextResponse.json({ error: firstError }, { status: 400 });
      }
      await confirmPasswordReset(parsed.data);
      return NextResponse.json({
        success: true,
        message: "Your password has been successfully updated. Please log in with your new password.",
      });
    }

    // Requesting reset (email only)
    const parsed = ResetPasswordRequestSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Invalid email address.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const result = await requestPasswordReset(parsed.data.email);
    return NextResponse.json(result);
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : "Internal server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
