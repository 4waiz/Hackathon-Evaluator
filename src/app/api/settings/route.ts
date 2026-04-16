import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { resetOpenAIClient } from "@/lib/openai";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const settings = await db.appSetting.findMany();
  const settingsMap: Record<string, string> = {};

  for (const s of settings) {
    // Never expose actual API key to client
    if (s.key === "openai_api_key") {
      settingsMap[s.key] = s.value ? "sk-...configured" : "";
    } else {
      settingsMap[s.key] = s.value;
    }
  }

  // Include env-based values
  settingsMap["mock_mode"] = process.env.MOCK_AI || "false";
  if (!settingsMap["openai_model"]) {
    settingsMap["openai_model"] = process.env.OPENAI_MODEL || "gpt-4o";
  }
  if (!settingsMap["openai_api_key"] && process.env.OPENAI_API_KEY) {
    settingsMap["openai_api_key"] = "sk-...configured (env)";
  }

  return NextResponse.json({ success: true, data: settingsMap });
}

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { key, value } = body as { key: string; value: string };

    if (!key) {
      return NextResponse.json({ success: false, error: "Key is required" }, { status: 400 });
    }

    // Allowed settings
    const allowedKeys = ["openai_api_key", "openai_model", "judge_weight", "code_weight"];
    if (!allowedKeys.includes(key)) {
      return NextResponse.json({ success: false, error: "Invalid setting key" }, { status: 400 });
    }

    await db.appSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });

    // Reset OpenAI client if key changed
    if (key === "openai_api_key") {
      resetOpenAIClient();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update setting" },
      { status: 500 }
    );
  }
}
