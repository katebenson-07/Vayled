import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Permanently deletes the signed-in studio's account and all of its data
 * (App Store rule: apps with accounts must let people delete them in-app).
 * Every table references auth.users with ON DELETE CASCADE, so removing the
 * auth user removes the rest. Uploaded photos are removed first.
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: "Not configured." }, { status: 501 });

  let confirm: string | undefined;
  try {
    confirm = (await req.json()).confirm;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (confirm !== "DELETE") return NextResponse.json({ error: "Type DELETE to confirm." }, { status: 400 });

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, serviceKey);
  const { data: userData, error } = await admin.auth.getUser(token);
  if (error || !userData.user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const uid = userData.user.id;

  // Remove uploaded photos (stored under a folder named for the studio).
  const { data: files } = await admin.storage.from("client-photos").list(uid, { limit: 1000 });
  if (files && files.length > 0) {
    await admin.storage.from("client-photos").remove(files.map((f) => `${uid}/${f.name}`));
  }

  const { error: delError } = await admin.auth.admin.deleteUser(uid);
  if (delError) return NextResponse.json({ error: "Couldn't delete the account. Email us and we'll do it." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
