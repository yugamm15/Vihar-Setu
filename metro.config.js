const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    extraNodeModules: {
      'react-native/Libraries/Image/AssetRegistry': path.resolve(
        __dirname,
        'node_modules/react-native/Libraries/Image/AssetRegistry.js'
      ),
      'react-native/asset-registry': path.resolve(
        __dirname,
        'node_modules/react-native/Libraries/Image/AssetRegistry.js'
      ),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
