This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Native Driver App

The native build is only needed for the driver-side app so background location can keep running while the app is minimized. Students continue using the regular web app in a browser.

Capacitor uses free/open-source packages only: Capacitor itself and `@capacitor-community/background-geolocation`. No paid maps, paid geolocation SDK, paid push service, or paid tiles are required.

Build and sync the driver app:

```bash
cd apps/web
pnpm build
npx cap add android
npx cap add ios
npx cap sync
```

For a packaged static native build, point the app directly at the API because the Next dev-server rewrite is not present inside the mobile bundle:

```bash
NEXT_OUTPUT_EXPORT=true NEXT_PUBLIC_API_BASE_URL=https://your-api-host.example.com pnpm build
npx cap sync
```

Then open `apps/web/android` in Android Studio or `apps/web/ios/App` in Xcode and build the installable driver app.

Native setup notes:

- Android: `capacitor.config.ts` sets `android.useLegacyBridge = true`, which the background geolocation plugin requires for long-running background updates. Android 13+ also requires notification permission for the foreground-service notification; if the OS does not prompt automatically in your build, request/enable notifications in Android Studio/testing before starting a trip.
- iOS: add location background capability in Xcode if it is not already present after sync: enable `Signing & Capabilities > Background Modes > Location updates`, and ensure `Info.plist` contains `NSLocationWhenInUseUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription`, and `UIBackgroundModes` with `location`.
- Android requires the persistent notification while tracking. The trip page configures it as `getPoint - Sharing your live location`; do not hide or suppress it.
