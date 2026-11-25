import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logoutUser } from "@/lib/services/auth/auth-service";
import { SESSION_COOKIE_NAME } from "@/lib/services/auth/session";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await logoutUser(token);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
