import { NextResponse } from "next/server";

import { loadConfig } from "@/lib/config-store";
import { NavidromeClient } from "@/lib/navidrome";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing cover art id." }, { status: 400 });
    }

    const config = await loadConfig();
    const navidrome = new NavidromeClient(config.navidrome);
    const response = await navidrome.fetchCoverArt(id);
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600"
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not fetch art." },
      { status: 500 }
    );
  }
}
