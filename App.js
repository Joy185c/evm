import React from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import SOSDemoScreen from './src/screens/SOSDemoScreen';

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#08111f' }}>
      <StatusBar barStyle="light-content" />
      <SOSDemoScreen />
    </SafeAreaView>
  );
}
