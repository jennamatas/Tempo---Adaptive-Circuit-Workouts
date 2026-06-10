import React from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

// Web build: mount Vercel Web Analytics + Speed Insights. These inject the
// /_vercel/insights and /_vercel/speed-insights beacons and collect Core Web
// Vitals automatically once the app is deployed on Vercel. (A sibling
// AnalyticsProvider.native.tsx renders nothing on iOS/Android.)
export function AnalyticsProvider() {
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
