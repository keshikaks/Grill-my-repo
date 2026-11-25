import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/services/auth/session";
import { getUserDashboardData } from "@/lib/services/persistence/persistence-service";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required to view dashboard." },
      { status: 401 }
    );
  }

  try {
    const data = await getUserDashboardData(user.id);
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      ...data,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load dashboard data.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
