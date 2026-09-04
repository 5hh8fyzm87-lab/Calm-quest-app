import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { CONTENT_COUNTS } from './src/content';

const contentProbe = `${CONTENT_COUNTS.quests} quests · ${CONTENT_COUNTS.affirmations} affirmations · ${CONTENT_COUNTS.prompts} prompts · ${CONTENT_COUNTS.verses} verses loaded`;

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.probe}>{contentProbe}</Text>
      <Text>Open up App.tsx to start working on your app!</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  probe: {
    fontSize: 14,
    color: '#555',
    marginBottom: 12,
    textAlign: 'center',
  },
});
