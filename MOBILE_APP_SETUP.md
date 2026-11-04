# Vayled mobile app (iOS + Android) setup

Vayled is wrapped with Capacitor. The native app is a thin shell that loads
https://www.vayled.com, so every website update shows up in the app right away
with no new App Store submission. App name: **Vayled**. Bundle ID: **com.vayled.app**.

## One-time setup (run in Terminal, inside the vayled-app folder)

1. Make sure the latest code is on the live site (git push, wait for Vercel to say Ready).
2. Install Capacitor:
   ```
   npm install @capacitor/core @capacitor/ios @capacitor/android @capacitor/app @capacitor/splash-screen @capacitor/status-bar @capacitor/camera @capacitor/share @capacitor/push-notifications @aparajita/capacitor-biometric-auth
   npm install -D @capacitor/cli @capacitor/assets
   ```
3. Create the native projects:
   ```
   npx cap add ios
   npx cap add android
   ```
4. Generate icons and splash screens from `resources/icon.png` and `resources/splash.png`:
   ```
   npm run cap:assets
   ```
5. Copy settings into the native projects (run this again any time capacitor.config.json changes):
   ```
   npm run cap:sync
   ```

## Native features already in the code
These only turn on inside the phone app. On the website nothing changes. The code is in
`lib/native.ts` and `components/NativeBridge.tsx`.

- **Photo picker and camera:** "+ Add inspo" and "+ Add preview result" on a bride's page open the phone's own Take Photo / Choose from Library sheet.
- **Share sheet:** the **Share** button on a timeline opens the phone's native share menu.
- **Face ID / fingerprint:** Settings > Personal Information shows a switch on phones that support it. When on, the app locks on open and after 30 seconds in the background.
- **Push notifications:** after sign-in the app asks permission and saves the phone's token to the `device_tokens` table (run the new SQL at the bottom of `supabase/schema.sql` in Supabase first). Tokens are collected now. Actually sending pushes (new inquiry, balance due, preview reminders) is a separate server step that needs an Apple push key and, for Android, a Firebase project. Not built yet.

### Native settings you must add after `npx cap add ios`
In Xcode, open `ios/App/App/Info.plist` and add these (Apple rejects the app without them):
- `NSCameraUsageDescription`: "Vayled uses the camera so you can add photos to a bride's page."
- `NSPhotoLibraryUsageDescription`: "Vayled lets you choose photos for a bride's page."
- `NSFaceIDUsageDescription`: "Vayled uses Face ID to keep your studio's information private."

Also in Xcode, **Signing & Capabilities > + Capability > Push Notifications** (and Background Modes > Remote notifications).

## iPhone build
- Needs Xcode (free, from the Mac App Store) and your Apple Developer account.
- `npm run cap:ios` opens Xcode. Click the **App** project, then **Signing & Capabilities**.
  Pick your team (Vayled LLC), and confirm the Bundle Identifier is `com.vayled.app`.
- Plug in an iPhone (or pick a simulator) and press Run to test.
- To submit: Product > Archive > Distribute App > App Store Connect.
- In App Store Connect, the app record must use the same bundle ID (`com.vayled.app`).

## Android build
- Needs Android Studio (free) and a Google Play developer account (one-time fee).
- `npm run cap:android` opens Android Studio. Build > Generate Signed Bundle / APK > Android App Bundle.
- Upload the .aab file in the Google Play Console.

## What App Store review will ask for
- **A demo login.** Public signup is off, so give the reviewer a working email and password in "App Review Information." Use a demo studio with fake data.
- **Privacy policy URL:** https://www.vayled.com/privacy
- **Screenshots:** iPhone sizes required (use the simulator).
- **Account deletion:** Apple requires people to be able to delete their account from inside the app if they can create one. Check this before submitting.
- **Not "just a website."** Apple can reject an app that only wraps a website (guideline 4.2). The camera and share plugins above are installed so the app can use native features, such as picking photos for a bride's page and sharing a timeline link. These need small code changes in the photo upload and timeline Share button. Push notifications are the strongest option and need an Apple push key.
- Review usually takes 1 to 3 days, but can take longer or come back with changes, so submit well before Nov 25.
