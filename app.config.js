/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  name: 'Tempo: Adaptive Circuit Workouts',
  description:
    'Adaptive circuit workouts that adjust to your pace. Build, run, and track HIIT and strength circuits with smart rest timers, exercise swaps, and progress history.',
  slug: 'fitness-workout-progress-103',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'fitness-workout-progress-103',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#0B0F17',
    },
    edgeToEdgeEnabled: true,
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#0B0F17',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  runtimeVersion: {
    policy: 'sdkVersion',
  },
  // PostHog credentials surfaced to the client via Constants.expoConfig.extra.
  extra: {
    posthogProjectToken: process.env.POSTHOG_PROJECT_TOKEN,
    posthogHost: process.env.POSTHOG_HOST,
  },
};
