# Bulkagachi Mobile

A mobile port of the Bulkagachi pet game from Bulk OS.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run in Browser (Development)
```bash
npm run dev
```
Then open http://localhost:5173 in your browser.

### 3. Build APK

#### Option A: Build Debug APK (Recommended)
```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

The APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

#### Option B: Open in Android Studio
```bash
npx cap open android
```
Then in Android Studio: Build → Build Bundle(s) / APK(s) → Build APK(s)

### 4. Install on Phone

#### Option A: Transfer via USB
1. Connect phone to computer via USB
2. Enable USB debugging on your phone:
   - Settings → About Phone → Tap "Build Number" 7 times
   - Settings → Developer Options → Enable USB Debugging
3. Transfer the APK file to your phone
4. Open the APK file on your phone to install

#### Option B: Install via ADB
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

#### Option C: Send to Phone
1. Email the APK to yourself
2. Or upload to Google Drive/Dropbox
3. Or use a file transfer app

#### Option D: Install Directly (if Android Studio is open)
1. Connect phone via USB
2. In Android Studio: Run → Run 'app'
3. Select your device

## Project Structure

```
bulkagachi-mobile/
├── src/
│   ├── pages/games/Bulkagachi.tsx   # Main game page
│   └── engines/BulkagachiEngine.ts   # Game logic
├── public/
│   └── images/gachi-s/               # All sprites
├── android/                          # Android native code
└── capacitor.config.json             # Capacitor config
```

## Features

- ✅ Pet stats (hunger, happiness, cleanliness, energy)
- ✅ Feed, Play, Sleep, Clean actions
- ✅ Evolution stages (Egg → Baby → Teen → Adult → Elder)
- ✅ Ghost mode
- ✅ Local storage persistence
- ✅ Mobile-optimized UI
- ✅ All sprites and backgrounds
- ✅ Animations
- ✅ Sound effects
