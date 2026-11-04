"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  FACE_ID_KEY,
  authenticateWithBiometrics,
  isNativeApp,
  nativePlatform,
  onAppStateChange,
  registerForPush,
} from "@/lib/native";

// How long the app can sit in the background before it asks for Face ID again.
const RELOCK_AFTER_MS = 30_000;

/**
 * Mounted once in the root layout. Does nothing on the website. In the phone
 * app it (1) registers the phone for push notifications once someone is signed
 * in and saves the device token, and (2) shows a Face ID / fingerprint lock if
 * the person turned that on in Settings.
 */
export default function NativeBridge() {
  const [locked, setLocked] = useState(false);
  const [checking, setChecking] = useState(false);
  const backgroundedAt = useRef<number | null>(null);

  const unlock = useCallback(async () => {
    setChecking(true);
    const ok = await authenticateWithBiometrics("Unlock Vayled");
    setChecking(false);
    if (ok) setLocked(false);
  }, []);

  // Face ID lock: on launch, and again when returning after a while away.
  useEffect(() => {
    if (!isNativeApp()) return;
    const enabled = () => localStorage.getItem(FACE_ID_KEY) === "on";

    if (enabled()) {
      setLocked(true);
      unlock();
    }

    onAppStateChange((isActive) => {
      if (!isActive) {
        backgroundedAt.current = Date.now();
        return;
      }
      const away = backgroundedAt.current ? Date.now() - backgroundedAt.current : 0;
      backgroundedAt.current = null;
      if (enabled() && away > RELOCK_AFTER_MS) {
        setLocked(true);
        unlock();
      }
    });
  }, [unlock]);

  // Push: register the phone for the signed-in user and save its token.
  useEffect(() => {
    if (!isNativeApp()) return;
    let cancelled = false;

    async function setup() {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user || cancelled) return;
      await registerForPush(async (token) => {
        await supabase
          .from("device_tokens")
          .upsert(
            { user_id: user.id, token, platform: nativePlatform(), updated_at: new Date().toISOString() },
            { onConflict: "token" }
          );
      });
    }
    setup();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") setup();
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!locked) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#4D0E12] text-[#FAF8F5] p-8 text-center">
      <p className="font-logo text-3xl tracking-[0.3em] mb-6">VAYLED</p>
      <p className="text-sm opacity-70 mb-8">Locked</p>
      <button
        onClick={unlock}
        disabled={checking}
        className="text-xs uppercase tracking-widest-lg rounded-full px-8 py-3 bg-[#FAF8F5] text-[#231815] disabled:opacity-50"
      >
        {checking ? "Checking..." : "Unlock"}
      </button>
    </div>
  );
}
