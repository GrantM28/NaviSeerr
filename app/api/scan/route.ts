import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { runScan } from "@/lib/dashboard";

export async function POST() {
  try {
    await runScan();
    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scan failed." },
      { status: 500 }
    );
  }
}
