import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/services/auth/session";
import {
  deleteUserRepository,
  OwnershipError,
} from "@/lib/services/persistence/persistence-service";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const repositoryId = body?.repositoryId;

    if (!repositoryId || typeof repositoryId !== "string") {
      return NextResponse.json(
        { error: "Repository ID is required." },
        { status: 400 }
      );
    }

    await deleteUserRepository(repositoryId, user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof OwnershipError) {
      return NextResponse.json(
        { error: "Repository not found or access denied." },
        { status: 404 }
      );
    }
    const message = err instanceof Error ? err.message : "Failed to delete repository.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
