const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure Metro can resolve ESM/mjs files
config.resolver.sourceExts = [...(config.resolver.sourceExts || []), 'mjs'];

// Force Metro to use project-local resolution only
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Prevent cross-project module resolution
config.resolver.disableHierarchicalLookup = true;

// Add alias for @supabase/node-fetch to prevent dynamic import issues
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@supabase/node-fetch': path.resolve(__dirname, 'shims', 'node-fetch.js'),
  // disableHierarchicalLookup (below) forces bare `semver` imports to the
  // hoisted root copy, which is v6 and lacks the `functions/*` subpath exports
  // that react-native-reanimated's worklet-version check imports. Pin to the
  // v7 copy so static web export can resolve `semver/functions/satisfies`.
  semver: path.dirname(require.resolve('semver/package.json', {
    paths: [path.resolve(__dirname, 'node_modules', 'react-native-reanimated')],
  })),
};

// Clear Metro transform cache on each build
config.resetCache = true;

// Ensure proper module resolution
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
];

module.exports = config;
