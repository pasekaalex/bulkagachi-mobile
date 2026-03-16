# Bulkagachi Mobile

A mobile port of the Bulkagachi pet game from Bulk OS.

## Tech Stack

- React + TypeScript
- Vite
- Capacitor (for mobile wrapping)

## Development

```bash
# Install dependencies
npm install

# Run in browser (dev mode)
npm run dev

# Build for web
npm run build

# Add Android platform (first time)
npx cap add android

# Sync web assets to Android
npx cap sync

# Open Android Studio
npx cap open android
```

## Building APK

To build an APK locally:
1. Install Android Studio with Android SDK
2. Run `npx cap open android`
3. In Android Studio: Build → Build Bundle(s) / APK(s) → Build APK(s)

## Features

- [x] Basic pet stats (hunger, happiness, energy)
- [x] Feed, Play, Sleep actions
- [x] Local storage persistence
- [x] Mobile-optimized UI

## TODO

- [ ] Copy over full game logic from Bulk OS
- [ ] Add evolution stages
- [ ] Add mini-games
- [ ] Add animations
- [ ] Add sound effects
- [ ] Add notifications
