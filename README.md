# Hamsafar Mobile

Native mobile rebuild of Hamsafar using Expo and React Native.

## Setup

1. Copy `.env.example` to `.env`
2. Fill in the `EXPO_PUBLIC_FIREBASE_*` values using the same Firebase project as the web app
3. Install dependencies:

```bash
npm install
```

4. Start Expo:

```bash
npm start
```

## Run targets

```bash
npm run android
npm run web
```

## Netlify deployment

1. In Netlify, set these environment variables individually for the site:
   - `EXPO_PUBLIC_FIREBASE_API_KEY`
   - `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
   - `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `EXPO_PUBLIC_FIREBASE_APP_ID`
   - `EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID`
2. Build with:

```bash
npm run build:web
```

3. Publish the generated `dist` folder, or let Netlify use the included `netlify.toml`.
4. After changing environment variables in Netlify, trigger a new deploy. Existing published builds do not pick up env changes automatically.

## What is implemented

- native auth flow for student, teacher, parent, and admin roles
- pending approval state tied to Firestore `users` docs
- realtime Firebase data hooks for lists, `where in`, and docs-by-id subscriptions
- mobile-native dashboards and role tab navigation
- teacher create flows for exams, grades, resources, and sessions
- admin create/manage flows for courses, classes, enrollments, teacher assignment, and parent-child linking

## Notes

- This app uses the current web project as the backend and feature reference
- The UI is rebuilt for mobile rather than copied from web
- Expo web export was validated during setup, but real-device testing is still recommended
