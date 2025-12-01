module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            // This forces every import of 'three' to use the one in your root folder
            three: './node_modules/three',
            'react-native-vector-icons': '@expo/vector-icons',
          },
        },
      ],
    ],
  };
};