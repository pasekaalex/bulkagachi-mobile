# Bulkagachi Mobile

Exact replica of bulked.lol/games/bulkagachi

## Run
```bash
npm install
npm run dev
```

## Build APK
```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

APK: `android/app/build/outputs/apk/debug/app-debug.apk`
