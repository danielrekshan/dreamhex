import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

// --- ADD THIS POLYFILL ---
// Polyfill for libraries (like three.js / troika-three-text) that blindly check for document
if (Platform.OS !== 'web') {
  (global as any).document = {
    createElement: (tagName: string) => {
      // Return a stub object that satisfies basic checks
      return { 
        style: {}, 
        getContext: () => null,
      };
    },
    getElementById: () => null,
    // Add other mocks if specific errors arise
  };
  
  // Optional: Some libraries also check window.document
  if (!(global as any).window) {
    (global as any).window = global;
  }
}
// -------------------------

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);