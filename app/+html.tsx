import React from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Root HTML document for every statically-rendered web page (Expo Router web).
// This is where global <head> metadata lives: favicons, SEO, Open Graph, and
// the PWA manifest. It runs at export time in Node, so keep it static.

const SITE_URL = 'https://tempo-adaptive-circuit-workouts.vercel.app';
const SITE_NAME = 'Tempo';
const TITLE = 'Tempo: Adaptive Circuit Workouts';
const DESCRIPTION =
  'Adaptive circuit workouts that adjust to your pace. Build, run, and track HIIT and strength circuits with smart rest timers, exercise swaps, and progress history.';
const OG_IMAGE = `${SITE_URL}/og-image.png`;
const THEME_COLOR = '#0B0F17';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        {/* Primary SEO */}
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <meta
          name="keywords"
          content="circuit workouts, HIIT, interval training, workout timer, fitness app, strength training, adaptive workouts, exercise tracker"
        />
        <meta name="application-name" content={SITE_NAME} />
        <meta name="author" content="Tempo" />
        <link rel="canonical" href={SITE_URL} />
        <meta name="robots" content="index, follow, max-image-preview:large" />

        {/* Theme / mobile web app */}
        <meta name="theme-color" content={THEME_COLOR} />
        <meta name="color-scheme" content="dark light" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content={SITE_NAME} />

        {/* Favicons & icons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />

        {/* Open Graph (Facebook, LinkedIn, iMessage, Slack…) */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Tempo — Adaptive Circuit Workouts" />
        <meta property="og:locale" content="en_US" />

        {/* Twitter / X card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
        <meta name="twitter:image" content={OG_IMAGE} />
        <meta name="twitter:image:alt" content="Tempo — Adaptive Circuit Workouts" />

        {/* Structured data for rich results */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: TITLE,
              applicationCategory: 'HealthApplication',
              operatingSystem: 'Web, iOS, Android',
              description: DESCRIPTION,
              url: SITE_URL,
              image: OG_IMAGE,
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
            }),
          }}
        />

        {/*
          Disable body scrolling on web so ScrollView components behave like
          their native counterparts. Required by Expo Router web.
        */}
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
