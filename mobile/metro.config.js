const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// 1. Force resolution to the root node_modules
config.resolver.extraNodeModules = {
  'three': path.resolve(__dirname, 'node_modules/three'),
};

// 2. Help Metro find the assets (Added 'mp3' to the list)
config.resolver.sourceExts = ['js', 'jsx', 'json', 'ts', 'tsx', 'cjs', 'mjs'];
config.resolver.assetExts = ['glb', 'gltf', 'png', 'jpg', 'ttf', 'mp4', 'mp3'];

// 3. Prevent Metro from seeing the duplicate 'three' inside other packages
config.resolver.blockList = [
  /node_modules\/.*\/node_modules\/three\/.*/,
];

module.exports = config;