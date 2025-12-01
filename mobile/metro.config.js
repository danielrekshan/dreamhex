// mobile/metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// 1. Force the bundler to resolve 'three' to your project's root node_modules
// This prevents libraries from using their own hidden copies.
config.resolver.extraNodeModules = {
  'three': path.resolve(__dirname, 'node_modules/three'),
};

// 2. Ensure standard file extensions are handled
config.resolver.sourceExts = ['js', 'jsx', 'json', 'ts', 'tsx', 'cjs', 'mjs'];
config.resolver.assetExts = ['glb', 'gltf', 'png', 'jpg', 'ttf', 'mp4'];

module.exports = config;