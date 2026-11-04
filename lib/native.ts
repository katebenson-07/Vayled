/**
 * Thin helpers for the native iPhone/Android app (Capacitor).
 *
 * The website is loaded inside the native shell, which injects a global
 * `window.Capacitor`. Everything here talks to that global, so on the normal
 * website (no shell) every helper quietly does nothing / returns null and the
 * existing web behavior is untouched.
 */

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  registerPlugin?: <T>(name: string) => T;
};

function cap(): CapacitorGlobal | null {
  if (typeof window === "undefined") return null;
  return ((window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor ?? null) as CapacitorGlobal | null;
}

export function isNativeApp(): boolean {
  return !!cap()?.isNativePlatform?.();
}

export function nativePlatform(): "ios" | "android" | "web" {
  const p = cap()?.getPlatform?.();
  return p === "ios" || p === "android" ? p : "web";
}

const pluginCache: Record<string, unknown> = {};

/** Returns the native plugin proxy, or null on the website. */
export function nativePlugin<T>(name: string): T | null {
  const c = cap();
  if (!c?.isNativePlatform?.() || !c.registerPlugin) return null;
  if (!(name in pluginCache)) pluginCache[name] = c.registerPlugin<T>(name);
  return pluginCache[name] as T;
}

/* ---------------------------------------------------------------- Camera */

type CameraPlugin = {
  getPhoto(opts: {
    quality?: number;
    resultType: "uri";
    source: "PROMPT" | "CAMERA" | "PHOTOS";
    promptLabelHeader?: string;
    promptLabelPhoto?: string;
    promptLabelPicture?: string;
    correctOrientation?: boolean;
  }): Promise<{ webPath?: string; format?: string }>;
};

/**
 * Opens the phone's native "Take Photo / Choose from Library" sheet and
 * returns the picked image as a File (so it can go through the same upload code
 * as a normal file input). Returns null if the user cancels or this isn't the app.
 */
export async function pickPhoto(): Promise<File | null> {
  const Camera = nativePlugin<CameraPlugin>("Camera");
  if (!Camera) return null;
  try {
    const photo = await Camera.getPhoto({
      quality: 85,
      resultType: "uri",
      source: "PROMPT",
      promptLabelHeader: "Add a photo",
      promptLabelPhoto: "Choose from library",
      promptLabelPicture: "Take photo",
      correctOrientation: true,
    });
    if (!photo.webPath) return null;
    const blob = await (await fetch(photo.webPath)).blob();
    const ext = photo.format || "jpeg";
    return new File([blob], `photo-${Date.now()}.${ext}`, { type: blob.type || `image/${ext}` });
  } catch {
    // User cancelled the sheet (or denied camera access).
    return null;
  }
}

/* ----------------------------------------------------------------- Share */

type SharePlugin = {
  share(opts: { title?: string; text?: string; url?: string; dialogTitle?: string }): Promise<unknown>;
};

/**
 * Opens the phone's native share sheet. Returns true if it was shown, false if
 * not in the app (the caller should then fall back to copying the link).
 */
export async function shareLink(opts: { title: string; text?: string; url: string }): Promise<boolean> {
  const Share = nativePlugin<SharePlugin>("Share");
  if (!Share) return false;
  try {
    await Share.share({ ...opts, dialogTitle: opts.title });
  } catch {
    // Cancelled — still counts as handled, don't also copy to clipboard.
  }
  return true;
}

/* ------------------------------------------------------------- Face ID */

type BiometricPlugin = {
  checkBiometry(): Promise<{ isAvailable: boolean }>;
  authenticate(opts: { reason: string; cancelTitle?: string; allowDeviceCredential?: boolean }): Promise<void>;
};

export async function biometricsAvailable(): Promise<boolean> {
  const Bio = nativePlugin<BiometricPlugin>("BiometricAuth");
  if (!Bio) return false;
  try {
    return (await Bio.checkBiometry()).isAvailable;
  } catch {
    return false;
  }
}

/** Resolves true if the person unlocked with Face ID / fingerprint / passcode. */
export async function authenticateWithBiometrics(reason = "Unlock Vayled"): Promise<boolean> {
  const Bio = nativePlugin<BiometricPlugin>("BiometricAuth");
  if (!Bio) return true; // not in the app: nothing to unlock
  try {
    await Bio.authenticate({ reason, cancelTitle: "Cancel", allowDeviceCredential: true });
    return true;
  } catch {
    return false;
  }
}

export const FACE_ID_KEY = "vayled-require-biometrics";

/* ------------------------------------------------------------------ Push */

type PushPlugin = {
  requestPermissions(): Promise<{ receive: string }>;
  register(): Promise<void>;
  addListener(event: "registration", cb: (token: { value: string }) => void): Promise<unknown>;
  addListener(event: "registrationError", cb: (err: unknown) => void): Promise<unknown>;
};

/**
 * Asks for notification permission and, if granted, gives the device token to
 * `onToken`. The token is what a server needs to send this phone a push.
 */
export async function registerForPush(onToken: (token: string) => void): Promise<void> {
  const Push = nativePlugin<PushPlugin>("PushNotifications");
  if (!Push) return;
  // Android needs a Firebase config file (google-services.json) before push can
  // register, and asking without one can crash the app. Skip Android until
  // Firebase is set up; remove this line then.
  if (nativePlatform() === "android") return;
  try {
    const perm = await Push.requestPermissions();
    if (perm.receive !== "granted") return;
    await Push.addListener("registration", (t) => onToken(t.value));
    await Push.register();
  } catch {
    // Push is a nice-to-have; never block the app on it.
  }
}

/* ------------------------------------------------------------- App state */

type AppPlugin = {
  addListener(event: "appStateChange", cb: (state: { isActive: boolean }) => void): Promise<unknown>;
};

export async function onAppStateChange(cb: (isActive: boolean) => void): Promise<void> {
  const App = nativePlugin<AppPlugin>("App");
  if (!App) return;
  await App.addListener("appStateChange", (s) => cb(s.isActive));
}
