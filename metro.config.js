const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure Metro can resolve ESM/.mjs files.
config.resolver.sourceExts = [...(config.resolver.sourceExts || []), 'mjs'];

// Keep non-standard env files out of the Metro module graph. The dev server
// otherwise tries to Babel-parse them as source and chokes on the leading `#`
// comment ("Unexpected token (1:0)"). These hold server/deploy-only secrets
// (.env.seed.local, .env.deploy.local) or are docs (.env*.example) and must
// never enter the client bundle. NOTE: the standard .env / .env.local /
// .env.<mode>[.local] files Expo loads are intentionally NOT matched here.
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList)
    ? config.resolver.blockList
    : config.resolver.blockList
      ? [config.resolver.blockList]
      : []),
  /\.env\.seed\.local$/,
  /\.env\.deploy\.local$/,
  /\.env(\.[^/.]+)?\.example$/,
];

// Alias @supabase/node-fetch to a local shim. The package's ESM dynamic import
// breaks under Metro; the shim points it at the global fetch instead
// (see shims/node-fetch.js).
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@supabase/node-fetch': path.resolve(__dirname, 'shims', 'node-fetch.js'),
};

module.exports = config;
