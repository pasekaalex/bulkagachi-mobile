# Bulkagachi Mobile

A mobile port of the Bulkagachi pet game from Bulk OS.

## Download

📥 **Download APK:** https://github.com/pasekaalex/bulkagachi-mobile/releases/tag/v1.0.3

## Features

- ✅ Pet stats (hunger, happiness, cleanliness, energy)
- ✅ 8 action buttons (FEED, PLAY, CLEAN, SLEEP, MEDS, SCHMEG, REST, TRAVEL)
- ✅ Evolution stages (Egg → Baby → Teen → Adult → Elder)
- ✅ 6 locations (Cabin, Camp, City, Beach, Mountain, Club)
- ✅ Ghost mode
- ✅ Poop system with golden poops
- ✅ Day/night cycle
- ✅ Achievements & collection
- ✅ Leaderboard (wallet connected)
- ✅ Local storage persistence
- ✅ Mobile-optimized UI
- ✅ Portrait only mode
- ✅ App icon

**Note:** Wallet connection is not available on mobile (Phantom doesn't support WebView). Leaderboard is view-only.

## Install APK

1. Download the APK from Releases
2. Enable "Install unknown apps" in phone settings
3. Open the APK file to install

## Build from Source

```bash
# Clone
git clone https://github.com/pasekaalex/bulkagachi-mobile.git
cd bulkagachi-mobile

# Install dependencies
npm install

# Run in browser
npm run dev

# Build APK
npm run build
npx cap add android
npx cap open android

# In Android Studio: Build → Build APK
```

## Tech Stack

- React + TypeScript
- Vite
- Capacitor (for mobile wrapping)

## Credits

Original game from [bulked.lol](https://bulked.lol/games/bulkagachi)
