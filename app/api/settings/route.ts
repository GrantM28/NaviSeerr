import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { saveConfig } from "@/lib/config-store";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      baseUrl?: string;
      username?: string;
      password?: string;
      lastfmApiKey?: string;
      requestWebhookUrl?: string;
      recentReleaseWindowDays?: number;
      autoRefreshHours?: number;
    };

    if (!body.baseUrl?.trim() || !body.username?.trim()) {
      return NextResponse.json({ error: "Navidrome URL and username are required." }, { status: 400 });
    }

    await saveConfig({
      baseUrl: body.baseUrl,
      username: body.username,
      password: body.password,
      lastfmApiKey: body.lastfmApiKey,
      requestWebhookUrl: body.requestWebhookUrl,
      recentReleaseWindowDays: body.recentReleaseWindowDays,
      autoRefreshHours: body.autoRefreshHours
    });

    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save settings." },
      { status: 500 }
    );
  }
}
