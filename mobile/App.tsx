import { StyleSheet, View, StatusBar } from 'react-native';
import { Asset } from 'expo-asset'; 
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'; 
import DreamScene, { DreamData } from './components/DreamScene';
import { LogBox } from 'react-native';

LogBox.ignoreLogs([
  "EXGL: gl.pixelStorei() doesn't support this parameter yet!",
  "THREE.WebGLRenderer: Context Lost."
]);

const getAssetUri = (requireSource: any): string => {
  const asset = Asset.fromModule(requireSource);
  return asset.uri || asset.localUri || '';
};

// --- MOCK DATA ---
const BG_FRAMES = [
    getAssetUri(require('./assets/background_0.jpg')), 
    getAssetUri(require('./assets/background_1.jpg')), 
    getAssetUri(require('./assets/background_2.jpg')), 
];

const SHEET_IMG = getAssetUri(require('./assets/station_0.png')); 

const MOCK_DREAM_JSON: DreamData = {
  hex: {
    title: "DreamHex: Debug Mode 3",
    description_360: "Visualizing Axes.",
    central_imagery: "Test",
    background_frames: BG_FRAMES,
    stations: [
      {
        id: "s1",
        position_index: 0,
        entity_name: "Test Entity",
        state_start: "idle",
        state_end: "active",
        entity_greeting: "...",
        interaction_options: [],
        sprite_image: SHEET_IMG,
        sprite_sheet_config: { filename: "station_0.png", cols: 2, rows: 2, count: 4 }
      },
    ]
  }
};

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.mainContainer} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar barStyle="light-content" hidden={true} />
        <View style={styles.gameArea}>
          <DreamScene 
            dreamJson={MOCK_DREAM_JSON} 
            onEntityPress={(station) => console.log("Pressed:", station.entity_name)}
          />
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1, 
    backgroundColor: 'black',
  },
  gameArea: {
    flex: 1, 
    width: '100%',
    height: '100%',
  }
});