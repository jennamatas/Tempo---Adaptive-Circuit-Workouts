import React from 'react';
import { Platform } from 'react-native';
import Head from 'expo-router/head';

const SITE_URL = 'https://tempo-adaptive-circuit-workouts.vercel.app';
const DEFAULT_OG = `${SITE_URL}/og-image.png`;

type Props = {
  /** Page title; " — Tempo" is appended unless `exact` is set. */
  title: string;
  description?: string;
  /** Path for the canonical/og:url, e.g. "/library". Defaults to "/". */
  path?: string;
  image?: string;
  /** Use the title verbatim, without the " — Tempo" suffix. */
  exact?: boolean;
};

// Per-route head tags for web. No-ops on native (expo-router/head only emits on
// web). Document-wide defaults live in app/+html.tsx; this overrides per page so
// shared links and search results show the right title/description.
export function Seo({ title, description, path = '/', image = DEFAULT_OG, exact }: Props) {
  if (Platform.OS !== 'web') return null;
  const fullTitle = exact ? title : `${title} — Tempo`;
  const url = `${SITE_URL}${path === '/' ? '' : path}`;
  return (
    <Head>
      <title>{fullTitle}</title>
      {description ? <meta name="description" content={description} /> : null}
      <link rel="canonical" href={url} />
      <meta property="og:title" content={fullTitle} />
      {description ? <meta property="og:description" content={description} /> : null}
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta name="twitter:title" content={fullTitle} />
      {description ? <meta name="twitter:description" content={description} /> : null}
      <meta name="twitter:image" content={image} />
    </Head>
  );
}
