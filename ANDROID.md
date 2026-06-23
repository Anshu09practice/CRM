# JJ CRM - Android App

## Overview
This is a fully offline Android app version of the JJ CRM system. It runs entirely on your phone's local storage - **no internet or server required**.

## How It Works
- The app uses your phone's IndexedDB (via Dexie.js) to store all data locally
- All inventory, billing, customer, expense data lives on your device
- Works 100% offline - no network connection needed
- Same UI and features as the web version

## Prerequisites

1. **Node.js** (v18+): https://nodejs.org
2. **Android Studio** (for building the APK): https://developer.android.com/studio
3. **Java JDK 17**: Required by Android Studio

## Quick Build (Debug APK)

### Option 1: Using the build script
```bash
# From the project root
build-android.bat
```

### Option 2: Manual steps
```bash
cd client

# Install dependencies
npm install

# Build the web app
npx vite build

# Sync to Android
npx cap sync android

# Open in Android Studio
npx cap open android
```

Then in Android Studio: **Build > Generate Signed Bundle/APK > APK**

### Option 3: Command-line APK (no Android Studio UI needed)
```bash
cd client/android
./gradlew assembleDebug
```
The APK will be at: `client/android/app/build/outputs/apk/debug/app-debug.apk`

## Install on Phone

1. Transfer the APK to your phone (USB, email, or file sharing)
2. On your phone, go to **Settings > Security > Install Unknown Apps** and allow it
3. Tap the APK file to install
4. Open "JJ CRM" app

## First-Time Setup

When you first open the app:
1. You'll be prompted to create an owner account (username + password)
2. Set a security question for password recovery
3. That's it! Start adding your inventory

## Features (All Work Offline)

- **Inventory Management**: Add, edit, delete items with categories
- **Purchase Tracking**: Record purchases, auto-update stock
- **Billing**: Create bills, track payments, print/share bills
- **Customer Management**: Track customers, credit balances
- **Expenses**: Record and categorize business expenses
- **Dashboard**: Sales trends, top items, stock alerts
- **Backup/Restore**: Export all data as JSON, restore from backup

## Data Backup

Your data is stored locally on the device. **Always keep backups!**

### Create Backup
Go to **Settings** and click "Create Backup" - this downloads a JSON file with all your data.

### Restore Backup
Go to **Settings** and click "Restore Backup" - select a previously exported JSON file.

### Recommended: Regular Backups
- Export backup weekly
- Keep copies on Google Drive or your computer
- Before uninstalling the app, always create a backup

## Updating the App

1. Run `build-android.bat` again
2. Install the new APK on your phone (it will update the existing app, keeping your data)

## Development

To test the app in offline mode on your computer:
```bash
cd client
npm run dev
```
Then in browser console: `localStorage.setItem('jj_offline_mode', 'true')` and refresh.

To test on a connected Android device:
```bash
cd client
npm run run:android
```

## Project Structure

```
client/
├── src/
│   ├── services/
│   │   ├── api.ts          # API proxy (routes to local or server)
│   │   ├── localDb.ts      # Full local database (Dexie/IndexedDB)
│   │   └── offlineDb.ts    # Legacy offline cache
│   ├── context/
│   │   └── AuthContext.tsx  # Auth (supports offline login)
│   └── components/         # UI components
├── android/                # Native Android project (Capacitor)
├── capacitor.config.ts     # Capacitor configuration
└── dist/                   # Built web assets (synced to Android)
```

## Troubleshooting

### App shows blank screen
- Clear app data: Settings > Apps > JJ CRM > Clear Data
- Reinstall the APK

### Lost my password
- Use the "Forgot Password" link on the login screen
- Answer your security question to reset

### Data disappeared
- Data is stored per-app. If you uninstall, data is lost
- Always keep backup JSON files
- Restore from backup in Settings

### App crashes on older phones
- Minimum Android version: 5.1 (API 22)
- Recommended: Android 8.0+ for best performance
