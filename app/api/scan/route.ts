import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { triggerScan } from "@/lib/dashboard";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      background?: boolean;
    };

    await triggerScan({
      background: body.background
    });

    revalidatePath("/");
    return NextResponse.json({ ok: true, background: Boolean(body.background) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scan failed." },
      { status: 500 }
    );
  }
}
