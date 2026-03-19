# Bulkagachi Mobile

A mobile port of the Bulkagachi pet game from Bulk OS.

## Download

📥 **Download Latest APK:** https://github.com/pasekaalex/bulkagachi-mobile/releases/latest

## Features

- ✅ Pet stats (hunger, happiness, cleanliness, energy)
- ✅ 8 action buttons (FEED, PLAY, CLEAN, SLEEP, MEDS, SCHMEG, REST, TRAVEL)
- ✅ Evolution stages (Egg → Baby → Teen → Adult → Elder)
- ✅ 6 locations (Cabin, Camp, City, Beach, Mountain, Club)
- ✅ Ghost mode
- ✅ Poop system with golden poops
- ✅ Day/night cycle
- ✅ Achievements & collection
- ✅ Leaderboard (view scores from website)
- ✅ XP system with level-ups
- ✅ XP popup notifications
- ✅ Local storage persistence
- ✅ Mobile-optimized UI
- ✅ Portrait only mode

## Install APK

1. Download the APK from Releases
2. Enable "Install unknown apps" in your phone's security settings
3. Open the APK file to install

## Growth Stages

| Stage | Time |
|-------|------|
| Egg | 1 hour |
| Baby | 0-8 hours |
| Teen | 8-22 hours |
| Adult | 22-96 hours |
| Elder | 96+ hours |

## Build from Source

```bash
# Clone
git clone https://github.com/pasekaalex/bulkagachi-mobile.git
cd bulkagachi-mobile

# Install dependencies
npm install

# Build web
npm run build

# Add Android platform
npx cap add android

# Open in Android Studio
npx cap open android

# In Android Studio: Build → Build APK
```

## Tech Stack

- React + TypeScript
- Vite
- Capacitor (mobile wrapping)

## Credits

- Original game: [bulked.lol](https://bulked.lol/games/bulkagachi)
- Built with permission from Bulk creator

## License

MIT
