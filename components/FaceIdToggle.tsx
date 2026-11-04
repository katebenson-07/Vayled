"use client";

import { useEffect, useState } from "react";
import { FACE_ID_KEY, authenticateWithBiometrics, biometricsAvailable, isNativeApp } from "@/lib/native";

/**
 * "Require Face ID to open Vayled" switch. Only appears inside the phone app,
 * and only on phones that have Face ID / fingerprint set up.
 */
export default function FaceIdToggle() {
  const [show, setShow] = useState(false);
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!isNativeApp()) return;
    biometricsAvailable().then((ok) => {
      setShow(ok);
      setOn(localStorage.getItem(FACE_ID_KEY) === "on");
    });
  }, []);

  async function change(next: boolean) {
    if (next) {
      // Prove it works before locking yourself out.
      const ok = await authenticateWithBiometrics("Turn on Face ID for Vayled");
      if (!ok) return;
      localStorage.setItem(FACE_ID_KEY, "on");
    } else {
      localStorage.removeItem(FACE_ID_KEY);
    }
    setOn(next);
  }

  if (!show) return null;

  return (
    <label className="flex items-center gap-2 text-sm mt-6 pt-6 border-t border-charcoal/10">
      <input type="checkbox" checked={on} onChange={(e) => change(e.target.checked)} />
      Require Face ID / fingerprint to open Vayled on this phone
    </label>
  );
}
