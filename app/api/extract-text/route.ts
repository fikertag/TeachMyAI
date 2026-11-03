import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { extractTextFromFile } from "@/lib/extract-text";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 },
      );
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit." },
        { status: 400 },
      );
    }

    const { title, text } = await extractTextFromFile(file);

    return NextResponse.json({
      success: true,
      title,
      text,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to extract text from file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
