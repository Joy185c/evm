import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { heroes, sufferer } from '../data/mockRangpur';
import { findNearestHeroes } from '../services/matching';

export default function SOSDemoScreen() {
  const rankedHeroes = useMemo(
    () =>
      findNearestHeroes({
        suffererLocation: sufferer.location,
        allHeroes: heroes,
        radiusKm: 5,
        limit: 5,
      }),
    []
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.badge}>Rangpur Emergency Help Demo</Text>
      <Text style={styles.title}>One-tap SOS for high-traffic Rangpur zones</Text>
      <Text style={styles.subtitle}>
        Demo context: Jahaj Company More, Station Road, and Royalty Mega Mall.
      </Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Active Sufferer</Text>
        <Text style={styles.label}>{sufferer.fullName}</Text>
        <Text style={styles.value}>{sufferer.location.label}</Text>
        <Text style={styles.caption}>
          On SOS tap: capture GPS, create `sos_requests`, and notify the nearest 5 heroes.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Nearest Available Heroes within 5 km</Text>
        {rankedHeroes.map((hero, index) => (
          <View key={hero.id} style={styles.heroRow}>
            <View>
              <Text style={styles.label}>
                #{index + 1} {hero.fullName}
              </Text>
              <Text style={styles.value}>{hero.currentLocation.label}</Text>
            </View>
            <Text style={styles.distance}>{hero.distanceKm.toFixed(2)} km</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Implementation Notes</Text>
        <Text style={styles.bullet}>• Update hero GPS in Firestore every 60 seconds.</Text>
        <Text style={styles.bullet}>• Use FCM data notifications plus custom emergency sound.</Text>
        <Text style={styles.bullet}>• Subscribe to the accepted hero document for live tracking.</Text>
        <Text style={styles.bullet}>• Render OSM tiles with Leaflet in a WebView-based map screen.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
    backgroundColor: '#08111f',
  },
  badge: {
    color: '#8dd3ff',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 36,
  },
  subtitle: {
    color: '#b7c4d6',
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#111c2d',
    borderColor: '#21324d',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    color: '#8dd3ff',
    fontSize: 16,
    fontWeight: '700',
  },
  label: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  value: {
    color: '#d9e3f0',
    fontSize: 14,
  },
  caption: {
    color: '#9bb0c8',
    fontSize: 13,
    lineHeight: 20,
  },
  heroRow: {
    alignItems: 'center',
    borderBottomColor: '#21324d',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  distance: {
    color: '#4de2a8',
    fontSize: 15,
    fontWeight: '800',
  },
  bullet: {
    color: '#d9e3f0',
    fontSize: 14,
    lineHeight: 22,
  },
});
