// mobile/metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Force all libraries to look for 'three' in the root node_modules
config.resolver.extraNodeModules = {
  'three': path.resolve(__dirname, 'node_modules/three'),
};

config.resolver.sourceExts = ['js', 'jsx', 'json', 'ts', 'tsx', 'cjs', 'mjs'];
config.resolver.assetExts = ['glb', 'gltf', 'png', 'jpg', 'ttf', 'mp4'];

module.exports = config;