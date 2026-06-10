// Native (iOS/Android) build: Vercel Web Analytics & Speed Insights are
// web-only, so this renders nothing. Metro resolves this file on native and
// AnalyticsProvider.tsx on web.
export function AnalyticsProvider() {
  return null;
}
