import { NextResponse } from "next/server";
import { RegisterInputSchema } from "@/lib/validation/auth";
import { registerUser, AuthError } from "@/lib/services/auth/auth-service";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/services/auth/session";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = RegisterInputSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Invalid registration data.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { user, token } = await registerUser(parsed.data);

    const response = NextResponse.json({ user }, { status: 201 });
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : "Internal server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
