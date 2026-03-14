import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { createWishlistItem, updateWishlistItem } from "@/lib/dashboard";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      artist?: string;
      title?: string;
      type?: "album" | "artist";
      reason?: string;
      source?: string;
    };

    if (!body.artist || !body.title || !body.type || !body.reason || !body.source) {
      return NextResponse.json({ error: "Wishlist payload is incomplete." }, { status: 400 });
    }

    await createWishlistItem({
      artist: body.artist,
      title: body.title,
      type: body.type,
      reason: body.reason,
      source: body.source
    });

    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save wishlist item." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      id?: string;
      action?: "remove" | "send";
    };

    if (!body.id || !body.action) {
      return NextResponse.json({ error: "Wishlist update payload is incomplete." }, { status: 400 });
    }

    await updateWishlistItem({
      id: body.id,
      action: body.action
    });

    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update wishlist item." },
      { status: 500 }
    );
  }
}
