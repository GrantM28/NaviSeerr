import { NextResponse } from "next/server";

import { getScanState } from "@/lib/dashboard";

export async function GET() {
  try {
    const state = await getScanState();
    return NextResponse.json(state);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load scan status." },
      { status: 500 }
    );
  }
}
